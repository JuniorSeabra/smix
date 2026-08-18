import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { DriveFileStream } from '../google-drive/interfaces/drive-file.interface';

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private googleDriveService: GoogleDriveService,
  ) {}

  // Verifica se o usuário tem assinatura ativa antes de qualquer acesso a arquivo.
  // Chamado sempre no backend — nunca confiar em uma checagem feita só no frontend.
  private async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
    });
    return !!subscription;
  }

  async getDownloadStream(userId: string, fileId: string, ip: string | undefined): Promise<DriveFileStream> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.status !== 'ACTIVE') {
      throw new NotFoundException('Arquivo não encontrado');
    }

    const allowed = await this.hasActiveSubscription(userId);
    if (!allowed) {
      throw new ForbiddenException('Assinatura ativa necessária para baixar este arquivo');
    }

    // Registro para auditoria e rate limiting de downloads
    await this.prisma.downloadLog.create({ data: { userId, fileId, ip } });

    // Streaming direto pelo backend (proxy) — o ID do Drive nunca é exposto ao cliente,
    // só os bytes do arquivo. Usa o nome cadastrado no S-MIX, mas preserva a extensão
    // real do arquivo no Drive (o cadastro admin costuma guardar só um nome amigável).
    const driveStream = await this.googleDriveService.getFileStream(file.googleDriveFileId);
    const extension = driveStream.name.includes('.') ? driveStream.name.split('.').pop() : undefined;
    const friendlyName =
      extension && !file.name.toLowerCase().endsWith(`.${extension.toLowerCase()}`)
        ? `${file.name}.${extension}`
        : file.name;
    return { ...driveStream, name: friendlyName };
  }
}
