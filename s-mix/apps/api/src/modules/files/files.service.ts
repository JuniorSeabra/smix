import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  // Verifica se o usuário tem assinatura ativa antes de qualquer acesso a arquivo.
  // Chamado sempre no backend — nunca confiar em uma checagem feita só no frontend.
  private async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
    });
    return !!subscription;
  }

  async getDownloadUrl(userId: string, fileId: string) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.status !== 'ACTIVE') {
      throw new NotFoundException('Arquivo não encontrado');
    }

    const allowed = await this.hasActiveSubscription(userId);
    if (!allowed) {
      throw new ForbiddenException('Assinatura ativa necessária para baixar este arquivo');
    }

    // Registro para auditoria e rate limiting de downloads
    await this.prisma.downloadLog.create({ data: { userId, fileId } });

    // Aqui entra a chamada real à Google Drive API (drive.files.get com alt=media,
    // ou geração de um link temporário) usando file.googleDriveFileId.
    // O ID do Drive NUNCA é exposto na resposta ao cliente — só o resultado do download.
    const driveDownloadUrl = await this.resolveGoogleDriveDownload(file.googleDriveFileId);

    return { downloadUrl: driveDownloadUrl, fileName: file.name };
  }

  private async resolveGoogleDriveDownload(googleDriveFileId: string): Promise<string> {
    // Placeholder: será implementado quando as credenciais do Google Drive
    // (GOOGLE_DRIVE_*) estiverem configuradas no .env. A implementação real deve
    // fazer streaming do arquivo pelo próprio backend (proxy) ou gerar um link
    // assinado de curta duração — nunca retornar um link público permanente do Drive.
    throw new Error('Integração com Google Drive ainda não configurada');
  }
}
