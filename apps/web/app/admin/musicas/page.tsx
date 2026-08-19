'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch, getToken } from '../../../lib/api';
import { AdminNav } from '../../../components/AdminNav';

type Artist = { id: string; name: string };
type Song = { id: string; title: string; category: string | null; status: string; artist: { name: string } };

export default function AdminMusicasPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);

  const [artistName, setArtistName] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const [songsRes, artistsRes] = await Promise.all([apiFetch('/admin/songs'), apiFetch('/artists')]);
    if (songsRes.ok) setSongs(await songsRes.json());
    if (artistsRes.ok) setArtists(await artistsRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  function handleVincular(e: React.FormEvent) {
    e.preventDefault();
    if (!artistName.trim() || !title.trim() || !file) return;

    setUploading(true);
    setProgress(0);
    setMessage(null);

    // XMLHttpRequest em vez de fetch porque só ele dá progresso de UPLOAD
    // (fetch só acompanha progresso de download) — útil pra arquivo grande.
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL}/admin/files/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        setMessage({ ok: true, text: `"${title}" vinculada e enviada pro Drive com sucesso.` });
        setTitle('');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        load();
      } else {
        const body = JSON.parse(xhr.responseText || '{}');
        setMessage({ ok: false, text: body?.message ?? 'Erro ao vincular e enviar o arquivo.' });
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setMessage({ ok: false, text: 'Erro de rede ao enviar o arquivo.' });
    };

    const formData = new FormData();
    formData.append('artistName', artistName.trim());
    formData.append('title', title.trim());
    formData.append('file', file);
    xhr.send(formData);
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
        <AdminNav current="/admin/musicas" />
      </div>

      <form onSubmit={handleVincular} className="rounded-xl2 bg-smix-surface border border-smix-border p-4 flex flex-col gap-3 mb-8 max-w-md">
        <h2 className="text-sm text-smix-muted">Cantor → Música → Arquivo → Vincular</h2>
        <p className="text-xs text-smix-muted -mt-2">
          Se o cantor já existir, a música entra na pasta dele no Drive automaticamente. Se não existir, o cantor e a pasta são criados na hora.
        </p>

        <input
          list="artist-suggestions"
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
          placeholder="Nome do cantor"
          className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
        />
        <datalist id="artist-suggestions">
          {artists.map((artist) => (
            <option key={artist.id} value={artist.name} />
          ))}
        </datalist>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nome da música"
          className="rounded-lg bg-smix-bg border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-accent"
        />

        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs text-smix-muted file:mr-3 file:rounded-lg file:border-0 file:bg-smix-primary file:px-3 file:py-2 file:text-xs file:font-medium file:text-white"
        />

        {uploading && (
          <div>
            <div className="h-1.5 rounded-full bg-smix-bg overflow-hidden">
              <div className="h-full bg-smix-accent transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-smix-muted mt-1">Enviando para o Google Drive... {progress}%</p>
          </div>
        )}

        {message && (
          <p className={`text-xs ${message.ok ? 'text-smix-accent' : 'text-red-400'}`}>{message.text}</p>
        )}

        <button
          type="submit"
          disabled={uploading || !artistName.trim() || !title.trim() || !file}
          className="rounded-lg bg-smix-primary px-4 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50 self-start"
        >
          {uploading ? `Enviando... ${progress}%` : 'Vincular'}
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
