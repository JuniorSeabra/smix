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
}
