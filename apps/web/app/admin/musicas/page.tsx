'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

type Artist = { id: string; name: string };
type Song = { id: string; title: string; category: string | null; status: string; artist: { name: string } };

export default function AdminMusicasPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [title, setTitle] = useState('');
  const [artistId, setArtistId] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [songsRes, artistsRes] = await Promise.all([apiFetch('/admin/songs'), apiFetch('/artists')]);
    if (songsRes.ok) setSongs(await songsRes.json());
    if (artistsRes.ok) {
      const list = await artistsRes.json();
      setArtists(list);
      if (list.length > 0) setArtistId((prev) => prev || list[0].id);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !artistId) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/songs', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), artistId, category: category.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Erro ao criar música');
      }
      setTitle('');
      setCategory('');
      setMessage('Música adicionada com sucesso.');
      load();
    } catch (err: any) {
      setMessage(err.message ?? 'Erro ao criar música');
    } finally {
      setSaving(false);
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

  return (
    <main className="min-h-screen px-6 py-8 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Músicas</h1>
        <nav className="flex gap-4 text-sm text-smix-muted">
          <a href="/admin" className="hover:text-smix-text transition">Dashboard</a>
          <a href="/admin/artistas" className="hover:text-smix-text transition">Artistas</a>
          <a href="/admin/musicas" className="text-smix-text">Músicas</a>
          <a href="/admin/arquivos" className="hover:text-smix-text transition">Arquivos</a>
          <a href="/admin/usuarios" className="hover:text-smix-text transition">Usuários</a>
        </nav>
      </div>

      <form onSubmit={handleCreate} className="rounded-xl2 bg-smix-surface border border-smix-border p-4 flex flex-col gap-3 mb-8 max-w-md">
        <h2 className="text-sm text-smix-muted">Adicionar nova música</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da música"
          className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
        />
        <select
          value={artistId}
          onChange={(e) => setArtistId(e.target.value)}
          className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
        >
          {artists.length === 0 && <option value="">Cadastre um artista primeiro</option>}
          {artists.map((artist) => (
            <option key={artist.id} value={artist.id}>{artist.name}</option>
          ))}
        </select>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Categoria (opcional)"
          className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
        />
        {message && <p className="text-xs text-smix-accent">{message}</p>}
        <button
          type="submit"
          disabled={saving || !artistId}
          className="rounded-lg bg-smix-primary px-4 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 self-start"
        >
          {saving ? 'Salvando...' : 'Adicionar música'}
        </button>
      </form>

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
          </div>
        ))}
        {songs.length === 0 && <p className="text-smix-muted text-sm">Nenhuma música cadastrada ainda.</p>}
      </div>
    </main>
  );
}
