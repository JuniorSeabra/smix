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
  // espelha o que encontra. (Upload direto pelo site não é possível: conta de
  // serviço não tem cota própria pra escrever em pasta pessoal — só ler
  // funciona sem essa restrição.)
  //
  // O Drive é a fonte da verdade: renomear lá e sincronizar aqui atualiza o que
  // já existe. Antes a sincronização só importava o que faltava e ignorava o
  // resto ("if (alreadyLinked) continue"), então corrigir a digitação de uma
  // música no Drive não tinha efeito nenhum no site — e renomear a pasta de um
  // cantor era pior, porque a busca era por nome e criava um artista duplicado.
  async syncFromDrive() {
    const folders = await this.googleDriveService.listArtistFolders();
    let artistsCreated = 0;
    let artistsRenamed = 0;
    let songsCreated = 0;
    let songsRenamed = 0;

    for (const folder of folders) {
      // Procura pelo id da pasta primeiro. O nome só entra como segundo
      // critério, pros artistas importados antes deste campo existir — nesses,
      // aproveita e grava o id, e a partir daí renomear a pasta funciona.
      let artist = await this.prisma.artist.findFirst({
        where: { googleDriveFolderId: folder.id },
      });

      if (!artist) {
        const porNome = await this.prisma.artist.findFirst({
          where: { name: { equals: folder.name, mode: 'insensitive' }, googleDriveFolderId: null },
        });
        if (porNome) {
          artist = await this.prisma.artist.update({
            where: { id: porNome.id },
            data: { googleDriveFolderId: folder.id },
          });
        }
      }

      if (!artist) {
        artist = await this.prisma.artist.create({
          data: { name: folder.name, googleDriveFolderId: folder.id },
        });
        artistsCreated++;
      } else if (artist.name !== folder.name) {
        artist = await this.prisma.artist.update({
          where: { id: artist.id },
          data: { name: folder.name },
        });
        artistsRenamed++;
      }

      const files = await this.googleDriveService.listFilesInFolder(folder.id);
      for (const driveFile of files) {
        const rawTitle = driveFile.name.replace(/\.[^./]+$/, '').trim() || driveFile.name;
        const title = cleanSongTitle(rawTitle, artist.name);

        const alreadyLinked = await this.prisma.file.findFirst({
          where: { googleDriveFileId: driveFile.id },
          include: { song: true },
        });

        if (alreadyLinked) {
          // Título e dono são recalculados do Drive a cada sincronização: além
          // da renomeação do arquivo, isso cobre o caso de mover a música pra
          // pasta de outro cantor, e o de o nome do artista ter mudado (o
          // título é derivado dele, já que cleanSongTitle o remove do começo).
          const precisaAtualizar =
            alreadyLinked.song.title !== title || alreadyLinked.song.artistId !== artist.id;
          if (precisaAtualizar) {
            await this.prisma.song.update({
              where: { id: alreadyLinked.songId },
              data: { title, artistId: artist.id },
            });
            songsRenamed++;
          }
          continue;
        }

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

    const partes = [
      `${artistsCreated} cantor(es) novo(s)`,
      `${songsCreated} música(s) nova(s)`,
    ];
    if (artistsRenamed) partes.push(`${artistsRenamed} cantor(es) renomeado(s)`);
    if (songsRenamed) partes.push(`${songsRenamed} música(s) atualizada(s)`);

    return {
      message: `Sincronizado: ${partes.join(', ')}.`,
      artistsCreated,
      artistsRenamed,
      songsCreated,
      songsRenamed,
    };
  }
}
