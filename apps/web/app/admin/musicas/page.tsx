'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { AdminNav } from '../../../components/AdminNav';

type Song = { id: string; title: string; category: string | null; status: string; artist: { name: string } };

export default function AdminMusicasPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const res = await apiFetch('/admin/songs');
    if (res.ok) setSongs(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await apiFetch('/admin/files/sync-drive', { method: 'POST' });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message ?? 'Erro ao sincronizar com o Drive');
      setSyncMessage({ ok: true, text: body.message });
      load();
    } catch (err: any) {
      setSyncMessage({ ok: false, text: err.message ?? 'Erro ao sincronizar com o Drive' });
    } finally {
      setSyncing(false);
    }
  }

  async function toggleStatus(song: Song) {
    const nextStatus = song.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await apiFetch(`/songs/${song.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) load();
  }

  async function handleDelete(song: Song) {
    const confirmed = window.confirm(
      `Excluir "${song.title}" definitivamente? O arquivo continua no Drive, só some do site — não é reversível.`,
    );
    if (!confirmed) return;

    const res = await apiFetch(`/songs/${song.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      alert(body?.message ?? 'Não foi possível excluir esta música.');
      return;
    }
    load();
  }

  return (
    <main className="min-h-screen px-6 py-8 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Músicas</h1>
        <AdminNav current="/admin/musicas" />
      </div>

      <div className="rounded-xl2 bg-smix-surface border border-smix-border p-4 flex flex-col gap-3 mb-8 max-w-lg">
        <h2 className="text-sm text-smix-muted">Como adicionar música</h2>
        <ol className="text-sm text-smix-text list-decimal list-inside flex flex-col gap-1">
          <li>No Google Drive, dentro da pasta <strong>S-MIX</strong>, crie (ou use) a pasta com o nome do cantor</li>
          <li>Coloque o arquivo da música dentro dessa pasta</li>
          <li>Clica em <strong>Sincronizar com o Drive</strong> aqui embaixo</li>
        </ol>
        <p className="text-xs text-smix-muted">
          O site lê as pastas e cria o cantor (se ainda não existir) e a música automaticamente, sem duplicar o que já foi importado antes.
        </p>

        {syncMessage && (
          <p className={`text-xs ${syncMessage.ok ? 'text-smix-accent' : 'text-red-400'}`}>{syncMessage.text}</p>
        )}

        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-lg bg-smix-primary px-4 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 self-start"
        >
          {syncing ? 'Sincronizando...' : 'Sincronizar com o Drive'}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {songs.map((song) => (
          <div
            key={song.id}
            className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 flex justify-between items-center text-sm"
          >
            <div>
              <p>{song.title}</p>
              <p className="text-smix-muted text-xs">{song.artist.name}{song.category ? ` · ${song.category}` : ''}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleStatus(song)}
                className={`text-xs px-2 py-1 rounded-full border ${
                  song.status === 'ACTIVE'
                    ? 'border-smix-accent text-smix-accent'
                    : 'border-smix-border text-smix-muted'
                }`}
              >
                {song.status}
              </button>
              <button onClick={() => handleDelete(song)} className="text-xs text-red-400 hover:underline">
                Excluir
              </button>
            </div>
          </div>
        ))}
        {songs.length === 0 && <p className="text-smix-muted text-sm">Nenhuma música cadastrada ainda.</p>}
      </div>
    </main>
  );
}
