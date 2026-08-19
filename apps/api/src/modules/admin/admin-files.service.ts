import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleDriveService } from '../google-drive/google-drive.service';

@Injectable()
export class AdminFilesService {
  constructor(
    private prisma: PrismaService,
    private googleDriveService: GoogleDriveService,
  ) {}

  list(songId?: string) {
    return this.prisma.file.findMany({
      where: songId ? { songId } : undefined,
      include: { song: { select: { title: true } }, license: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  create(data: { songId: string; name: string; type: string; googleDriveFileId: string; licenseId?: string }) {
    return this.prisma.file.create({ data });
  }

  update(id: string, data: { name?: string; type?: string; googleDriveFileId?: string; status?: 'ACTIVE' | 'INACTIVE' }) {
    return this.prisma.file.update({ where: { id }, data });
  }

  listLicenses() {
    return this.prisma.license.findMany({ orderBy: { name: 'asc' } });
  }

  createLicense(data: { name: string; type: string; source?: string; notes?: string }) {
    return this.prisma.license.create({ data });
  }

  // Fluxo simplificado: Cantor + Música + arquivo do computador -> "Vincular".
  // Reaproveita o artista se já existir (por nome, sem diferenciar
  // maiúscula/acento), sobe o arquivo pra pasta dele no Drive (cria a pasta
  // só se ainda não existir) e já cria a música com o arquivo vinculado.
  async uploadAndLink(artistName: string, title: string, file: Express.Multer.File) {
    const name = artistName.trim();

    let artist = await this.prisma.artist.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (!artist) {
      artist = await this.prisma.artist.create({ data: { name } });
    }

    const folderId = await this.googleDriveService.findOrCreateArtistFolder(artist.name);
    const driveFile = await this.googleDriveService.uploadFile(folderId, file.originalname, file.path, file.mimetype);

    const song = await this.prisma.song.create({ data: { title: title.trim(), artistId: artist.id } });
    const createdFile = await this.prisma.file.create({
      data: {
        songId: song.id,
        name: 'Playback completo',
        type: 'full',
        googleDriveFileId: driveFile.id,
      },
    });

    return { artist, song, file: createdFile };
  }
}
