import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ArtistsService {
  constructor(private prisma: PrismaService) {}

  // Listagem pública (carrossel da home)
  findAll(search?: string) {
    return this.prisma.artist.findMany({
      where: {
        status: 'ACTIVE',
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  // Página do artista: músicas em ordem alfabética
  findOneWithSongs(id: string) {
    return this.prisma.artist.findUnique({
      where: { id },
      include: {
        songs: {
          where: { status: 'ACTIVE' },
          orderBy: { title: 'asc' },
        },
      },
    });
  }

  // Somente admin
  create(data: { name: string; photoUrl?: string; description?: string }) {
    return this.prisma.artist.create({ data });
  }

  update(id: string, data: { name?: string; photoUrl?: string; description?: string; status?: 'ACTIVE' | 'INACTIVE' }) {
    return this.prisma.artist.update({ where: { id }, data });
  }

  // Exclui de verdade (não é o "Desativar"). Precisa apagar primeiro tudo
  // que referencia as músicas desse artista, senão o banco recusa por
  // violar chave estrangeira.
  async remove(id: string) {
    const songIds = (await this.prisma.song.findMany({ where: { artistId: id }, select: { id: true } })).map(
      (s) => s.id,
    );
    const fileIds = (
      await this.prisma.file.findMany({ where: { songId: { in: songIds } }, select: { id: true } })
    ).map((f) => f.id);

    await this.prisma.$transaction([
      this.prisma.downloadLog.deleteMany({ where: { fileId: { in: fileIds } } }),
      this.prisma.file.deleteMany({ where: { songId: { in: songIds } } }),
      this.prisma.song.deleteMany({ where: { artistId: id } }),
      this.prisma.artist.delete({ where: { id } }),
    ]);

    return { message: 'Artista excluído.' };
  }
}
