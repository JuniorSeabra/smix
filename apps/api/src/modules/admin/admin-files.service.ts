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

  // Alternativa ao upload direto (que esbarra num limite do Google: conta de
  // serviço não tem cota própria pra SUBIR arquivo numa pasta pessoal comum —
  // só ler funciona sem restrição). Aqui o admin sobe o arquivo direto no
  // Google Drive (pelo app/site do Drive mesmo) dentro da pasta do cantor, e
  // o S-MIX só LÊ a estrutura de pastas e importa o que ainda não existe.
  async syncFromDrive() {
    const folders = await this.googleDriveService.listArtistFolders();
    let artistsCreated = 0;
    let songsCreated = 0;

    for (const folder of folders) {
      let artist = await this.prisma.artist.findFirst({
        where: { name: { equals: folder.name, mode: 'insensitive' } },
      });
      if (!artist) {
        artist = await this.prisma.artist.create({ data: { name: folder.name } });
        artistsCreated++;
      }

      const files = await this.googleDriveService.listFilesInFolder(folder.id);
      for (const driveFile of files) {
        const alreadyLinked = await this.prisma.file.findFirst({
          where: { googleDriveFileId: driveFile.id },
        });
        if (alreadyLinked) continue;

        const title = driveFile.name.replace(/\.[^./]+$/, '').trim() || driveFile.name;
        const song = await this.prisma.song.create({ data: { title, artistId: artist.id } });
        await this.prisma.file.create({
          data: {
            songId: song.id,
            name: 'Playback completo',
            type: 'full',
            googleDriveFileId: driveFile.id,
          },
        });
        songsCreated++;
      }
    }

    return {
      message: `Sincronizado: ${artistsCreated} cantor(es) novo(s), ${songsCreated} música(s) nova(s).`,
      artistsCreated,
      songsCreated,
    };
  }
}
