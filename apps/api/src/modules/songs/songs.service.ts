import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SongsService {
  constructor(private prisma: PrismaService) {}

  // Busca unificada: título da música OU nome do artista
  async search(query: string) {
    return this.prisma.song.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { artist: { name: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: { artist: true },
      orderBy: { title: 'asc' },
      take: 30,
    });
  }

  findOne(id: string) {
    return this.prisma.song.findUnique({
      where: { id },
      include: { artist: true, files: { where: { status: 'ACTIVE' } } },
    });
  }

  create(data: { title: string; artistId: string; description?: string; coverUrl?: string; category?: string }) {
    return this.prisma.song.create({ data });
  }

  update(
    id: string,
    data: {
      title?: string;
      description?: string;
      coverUrl?: string;
      category?: string;
      status?: 'ACTIVE' | 'INACTIVE';
    },
  ) {
    return this.prisma.song.update({ where: { id }, data });
  }
}
