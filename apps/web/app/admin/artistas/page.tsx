'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { AdminNav } from '../../../components/AdminNav';
import { AdminBottomNav } from '../../../components/AdminBottomNav';

type Artist = { id: string; name: string; description: string | null; status: string };

// Cadastro manual de artista foi removido de propósito: os cantores passam a
// ser criados exclusivamente pela integração (Sincronizar com o Drive, em
// /admin/musicas), a partir das pastas reais. Esta tela só lista e exclui.
export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);

  async function load() {
    const res = await apiFetch('/artists');
    if (res.ok) setArtists(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(artist: Artist) {
    const confirmed = window.confirm(
      `Excluir "${artist.name}" definitivamente? Isso apaga também todas as músicas e arquivos vinculados a ele — não é reversível. O arquivo continua no Drive, só some do site.`,
    );
    if (!confirmed) return;

    const res = await apiFetch(`/artists/${artist.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      alert(body?.message ?? 'Não foi possível excluir este artista.');
      return;
    }
    load();
  }

  return (
    <main className="min-h-screen px-6 py-8 max-w-4xl mx-auto pb-28">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Artistas</h1>
        <AdminNav current="/admin/artistas" />
      </div>

      <p className="text-smix-muted text-sm mb-6">
        Os cantores são criados automaticamente pelas pastas do Drive — use{' '}
        <a href="/admin/musicas" className="text-smix-accent hover:underline">
          Músicas → Sincronizar com o Drive
        </a>
        .
      </p>

      <div className="flex flex-col gap-2">
        {artists.map((artist) => (
          <div
            key={artist.id}
            className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 flex justify-between items-center text-sm"
          >
            <span>{artist.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-smix-muted text-xs">{artist.status}</span>
              <button onClick={() => handleDelete(artist)} className="text-xs text-red-400 hover:underline">
                Excluir
              </button>
            </div>
          </div>
        ))}
        {artists.length === 0 && <p className="text-smix-muted text-sm">Nenhum artista cadastrado ainda.</p>}
      </div>

      <AdminBottomNav current="/admin/artistas" />
    </main>
  );
}
