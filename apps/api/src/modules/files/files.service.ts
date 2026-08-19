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

    // Registro para auditoria e rate limiting de downloads
    await this.prisma.downloadLog.create({ data: { userId, fileId, ip } });

    // Streaming direto pelo backend (proxy) — o ID do Drive nunca é exposto ao cliente,
    // só os bytes do arquivo. O nome do download vem sempre do artista + música
    // cadastrados no banco (o mesmo texto que aparece na busca/nas telas do site),
    // nunca do nome do arquivo dentro do Drive — só a extensão real vem de lá.
    const driveStream = await this.googleDriveService.getFileStream(file.googleDriveFileId);
    const extension = driveStream.name.includes('.') ? driveStream.name.split('.').pop() : undefined;

    const baseName = `${file.song.artist.name} - ${file.song.title}`;
    const friendlyName = extension ? `${baseName}.${extension}` : baseName;

    return { ...driveStream, name: friendlyName };
  }
}
