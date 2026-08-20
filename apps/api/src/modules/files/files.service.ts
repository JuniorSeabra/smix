import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { isSubscriptionRequired } from '../../common/config/features';

// Quanto tempo a liberação no Drive fica de pé. Precisa cobrir o download
// inteiro de um multitrack de centenas de MB numa conexão de celular — revogar
// no meio cortaria o arquivo pela metade. Uma hora dá folga pra isso e ainda
// deixa a janela curta o bastante pra um link copiado não valer quase nada.
const SHARE_TTL_MINUTES = 60;

// O sweep roda junto do download, não num cron: no plano grátis a API dorme
// quando ninguém usa, e um agendador simplesmente não dispararia. Mesma
// abordagem já usada na limpeza das mensagens do chat.
const SWEEP_THROTTLE_MS = 60_000;

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private lastSweepAt = 0;

  constructor(
    private prisma: PrismaService,
    private googleDriveService: GoogleDriveService,
  ) {}

  // Verifica se o usuário tem assinatura ativa antes de qualquer acesso a arquivo.
  // Chamado sempre no backend — nunca confiar em uma checagem feita só no frontend.
  private async hasActiveSubscription(userId: string): Promise<boolean> {
    // Enquanto a plataforma está em teste e o gateway não cobra de verdade, dá
    // pra liberar geral com REQUIRE_SUBSCRIPTION=false. Ligado (padrão) o
    // catálogo continua fechado pra quem não tem assinatura ativa.
    if (!isSubscriptionRequired()) return true;

    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
    });
    return !!subscription;
  }

  // Fecha as liberações vencidas. Só remove do banco as que o Drive confirmou
  // revogadas — se a chamada falhar, a linha fica e a próxima passada tenta de
  // novo, senão um erro momentâneo do Google deixaria o arquivo público pra sempre.
  async revokeExpiredShares(): Promise<number> {
    const expired = await this.prisma.driveShare.findMany({
      where: { expiresAt: { lt: new Date() } },
      take: 50,
    });

    let revoked = 0;
    for (const share of expired) {
      const ok = await this.googleDriveService.revokePublicAccess(share.googleDriveFileId, share.permissionId);
      if (ok) {
        await this.prisma.driveShare.delete({ where: { id: share.id } });
        revoked++;
      }
    }
    if (revoked > 0) this.logger.log(`${revoked} liberação(ões) de download revogada(s)`);
    return revoked;
  }

  private async sweepIfDue(): Promise<void> {
    const now = Date.now();
    if (now - this.lastSweepAt < SWEEP_THROTTLE_MS) return;
    this.lastSweepAt = now;
    try {
      await this.revokeExpiredShares();
    } catch (err) {
      // Limpeza não pode derrubar o download de quem está esperando agora.
      this.logger.error('Falha no sweep de liberações vencidas', err as Error);
    }
  }

  // Valida a assinatura, registra o download e devolve o link direto do Drive.
  //
  // O arquivo não passa mais pelo servidor: o proxy anterior consumia a banda do
  // plano grátis na velocidade dos multitracks (800MB por download) e suspendeu a
  // API. Agora o backend continua sendo o único a decidir QUEM pode baixar — só
  // que entrega um link em vez dos bytes.
  async getDownloadUrl(userId: string, fileId: string, ip: string | undefined): Promise<string> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { song: { include: { artist: true } } },
    });
    if (!file || file.status !== 'ACTIVE') {
      throw new NotFoundException('Arquivo não encontrado');
    }

    const allowed = await this.hasActiveSubscription(userId);
    if (!allowed) {
      throw new ForbiddenException('Assinatura ativa necessária para baixar este arquivo');
    }

    await this.sweepIfDue();

    // Registro para auditoria e rate limiting de downloads
    await this.prisma.downloadLog.create({ data: { userId, fileId, ip } });

    // Se o arquivo já está liberado e a janela ainda tem folga, reaproveita: dois
    // músicos da mesma equipe baixando o mesmo playback não precisam de duas
    // permissões, e criar uma segunda deixaria a primeira órfã no Drive.
    const existing = await this.prisma.driveShare.findFirst({
      where: {
        googleDriveFileId: file.googleDriveFileId,
        expiresAt: { gt: new Date(Date.now() + 5 * 60_000) },
      },
    });
    if (existing) {
      return this.googleDriveService.buildDownloadUrl(file.googleDriveFileId);
    }

    const { permissionId, downloadUrl } = await this.googleDriveService.grantTemporaryPublicAccess(
      file.googleDriveFileId,
    );

    await this.prisma.driveShare.create({
      data: {
        googleDriveFileId: file.googleDriveFileId,
        permissionId,
        expiresAt: new Date(Date.now() + SHARE_TTL_MINUTES * 60_000),
      },
    });

    return downloadUrl;
  }
}
