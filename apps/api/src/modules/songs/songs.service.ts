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

  // Busca em duas etapas:
  // 1) Correspondência direta (substring) — o texto digitado precisa aparecer
  //    de verdade no título ou no nome do artista. É o caso normal e não erra.
  // 2) Só se a etapa 1 não achar nada, cai pra fuzzy (Fuse.js) com limiar
  //    apertado — pega erro de digitação tipo "Jorge Matues" → "Jorge & Mateus",
  //    mas sem misturar resultado sem relação nenhuma com a busca.
  async search(query: string) {
    const q = normalize(query);
    if (!q) return [];

    const songs = await this.prisma.song.findMany({
      where: { status: 'ACTIVE' },
      include: { artist: true },
    });

    const searchable = songs.map((song) => ({
      song,
      normalizedTitle: normalize(song.title),
      normalizedArtist: normalize(song.artist.name),
    }));

    const directMatches = searchable.filter(
      (item) => item.normalizedTitle.includes(q) || item.normalizedArtist.includes(q),
    );
    if (directMatches.length > 0) {
      return directMatches.slice(0, 30).map((item) => item.song);
    }

    const fuse = new Fuse(searchable, {
      keys: [
        { name: 'normalizedTitle', weight: 0.5 },
        { name: 'normalizedArtist', weight: 0.5 },
      ],
      threshold: 0.3,
      minMatchCharLength: 3,
    });

    return fuse
      .search(q, { limit: 30 })
      .map((result) => result.item.song);
  }

  // O select dos arquivos é explícito de propósito. Esta rota é pública
  // (GET /songs/:id, sem guard), e um include solto devolvia TODOS os campos de
  // File — inclusive googleDriveFileId. Com esse id em mãos, qualquer pessoa não
  // autenticada podia baixar direto do Google Drive durante a janela de 60min em
  // que FilesService deixa o arquivo com permissão 'anyone', sem passar pela
  // checagem de assinatura e sem aparecer no DownloadLog.
  //
  // O googleDriveFileId nunca deve sair da API: quem precisa dele é o próprio
  // backend, em GET /files/:id/download, que só responde após validar assinatura.
  findOne(id: string) {
    return this.prisma.song.findUnique({
      where: { id },
      include: {
        artist: true,
        files: {
          where: { status: 'ACTIVE' },
          select: { id: true, name: true, type: true, size: true, createdAt: true },
        },
      },
    });
  }

  // Pública (Home) — só o agregado (título/artista/contagem), nunca dado de
  // usuário. Parte de DownloadLog.groupBy por fileId (poucas linhas, uma por
  // arquivo distinto já baixado) em vez de carregar cada download — soma por
  // música porque uma música pode ter mais de um arquivo (stems).
  async getTrending(limit = 3) {
    const topFiles = await this.prisma.downloadLog.groupBy({
      by: ['fileId'],
      _count: { fileId: true },
    });
    if (topFiles.length === 0) return [];

    const files = await this.prisma.file.findMany({
      where: { id: { in: topFiles.map((f) => f.fileId) }, status: 'ACTIVE' },
      select: {
        id: true,
        song: {
          select: {
            id: true,
            title: true,
            status: true,
            artist: { select: { id: true, name: true, photoUrl: true, status: true } },
          },
        },
      },
    });

    const bySong = new Map<
      string,
      { title: string; artistId: string; artistName: string; artistPhotoUrl: string | null; downloads: number }
    >();
    for (const row of topFiles) {
      const file = files.find((f) => f.id === row.fileId);
      const song = file?.song;
      if (!song || song.status !== 'ACTIVE' || song.artist.status !== 'ACTIVE') continue;

      const existing = bySong.get(song.id);
      if (existing) {
        existing.downloads += row._count.fileId;
      } else {
        bySong.set(song.id, {
          title: song.title,
          artistId: song.artist.id,
          artistName: song.artist.name,
          artistPhotoUrl: song.artist.photoUrl,
          downloads: row._count.fileId,
        });
      }
    }

    return Array.from(bySong.entries())
      .map(([songId, data]) => ({ songId, ...data }))
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
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

  // Exclui de verdade (não é o toggle de status). Apaga primeiro os
  // arquivos vinculados e os logs de download deles.
  async remove(id: string) {
    const fileIds = (await this.prisma.file.findMany({ where: { songId: id }, select: { id: true } })).map(
      (f) => f.id,
    );

    await this.prisma.$transaction([
      this.prisma.downloadLog.deleteMany({ where: { fileId: { in: fileIds } } }),
      this.prisma.file.deleteMany({ where: { songId: id } }),
      this.prisma.song.delete({ where: { id } }),
    ]);

    return { message: 'Música excluída.' };
  }
}
