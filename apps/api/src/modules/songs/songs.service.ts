import { Injectable } from '@nestjs/common';
import Fuse from 'fuse.js';
import { PrismaService } from '../../prisma/prisma.service';

// Remove acentos e normaliza caixa, pra "joao gomes" e "João Gomes" baterem igual,
// e pra reduzir a distância de edição em erros de digitação com acento.
// Usa ̀-ͯ (faixa Unicode dos diacríticos combinantes) via code point,
// em vez do caractere literal, pra não depender de encoding do editor/CI.
const COMBINING_DIACRITICS = new RegExp('[̀-ͯ]', 'g');

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class SongsService {
  constructor(private prisma: PrismaService) {}

  // Busca fuzzy unificada: título, artista, ou os dois juntos — tolerante a erro de
  // digitação, acento e pequenas diferenças ortográficas (ex: "Jorge Matues" → "Jorge & Mateus").
  // O catálogo inteiro é carregado e comparado em memória (Fuse.js); em escala de milhares
  // de músicas isso ainda é rápido, mas se crescer muito além disso vale mover pra uma busca
  // no próprio Postgres (pg_trgm) ou um índice dedicado.
  async search(query: string) {
    const q = query.trim();
    if (!q) return [];

    const songs = await this.prisma.song.findMany({
      where: { status: 'ACTIVE' },
      include: { artist: true },
    });

    const searchable = songs.map((song) => ({
      song,
      normalizedTitle: normalize(song.title),
      normalizedArtist: normalize(song.artist.name),
      normalizedCombined: normalize(`${song.artist.name} ${song.title}`),
    }));

    const fuse = new Fuse(searchable, {
      keys: [
        { name: 'normalizedTitle', weight: 0.4 },
        { name: 'normalizedArtist', weight: 0.4 },
        { name: 'normalizedCombined', weight: 0.2 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });

    return fuse
      .search(normalize(q), { limit: 30 })
      .map((result) => result.item.song);
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
