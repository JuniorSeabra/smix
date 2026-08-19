'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { AdminNav } from '../../../components/AdminNav';

type Artist = { id: string; name: string; description: string | null; status: string };

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/artists', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Erro ao criar artista');
      }
      setName('');
      setDescription('');
      setMessage('Artista adicionado com sucesso.');
      load();
    } catch (err: any) {
      setMessage(err.message ?? 'Erro ao criar artista');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-8 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Artistas</h1>
        <AdminNav current="/admin/artistas" />
      </div>

      <form onSubmit={handleCreate} className="rounded-xl2 bg-smix-surface border border-smix-border p-4 flex flex-col gap-3 mb-8 max-w-md">
        <h2 className="text-sm text-smix-muted">Adicionar novo artista</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do artista"
          className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição (opcional)"
          rows={2}
          className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent resize-none"
        />
        {message && <p className="text-xs text-smix-accent">{message}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-smix-primary px-4 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 self-start"
        >
          {saving ? 'Salvando...' : 'Adicionar artista'}
        </button>
      </form>

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
    </main>
  );
}
