import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleDriveService } from '../google-drive/google-drive.service';

// Nome de arquivo do Drive costuma vir como "Artista - Música.ext" — sem
// isso, o título salvo ficava com o nome do cantor duplicado dentro dele
// (ex: música "Gabriel Guedes - A Benção" pro artista "Gabriel Guedes").
// Tira o nome do artista de dentro do título e limpa separador sobrando.
function cleanSongTitle(rawTitle: string, artistName: string): string {
  const escapedArtist = artistName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withoutArtist = rawTitle.replace(new RegExp(escapedArtist, 'ig'), '');
  const cleaned = withoutArtist
    .replace(/^[\s\-–_:]+|[\s\-–_:]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned || rawTitle.trim();
}

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

  // Sobe o arquivo direto no Google Drive (pelo app/site do Drive mesmo)
  // dentro da pasta do cantor, e o S-MIX só LÊ a estrutura de pastas e
  // importa o que ainda não existe. (Upload direto pelo site não é possível:
  // conta de serviço não tem cota própria pra escrever em pasta pessoal —
  // só ler funciona sem essa restrição.)
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

        const rawTitle = driveFile.name.replace(/\.[^./]+$/, '').trim() || driveFile.name;
        const title = cleanSongTitle(rawTitle, artist.name);

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
