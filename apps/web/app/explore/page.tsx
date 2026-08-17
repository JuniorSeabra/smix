'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';

type Artist = { id: string; name: string; photoUrl: string | null };
type SongResult = { id: string; title: string; artist: { name: string } };

export default function ExplorePage() {
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<SongResult[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setSongs([]);
      setArtists([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const [songsRes, artistsRes] = await Promise.all([
          apiFetch(`/songs/search?q=${encodeURIComponent(query)}`),
          apiFetch(`/artists?search=${encodeURIComponent(query)}`),
        ]);
        setSongs(await songsRes.json());
        setArtists(await artistsRes.json());
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <main className="min-h-screen pb-24 md:pb-8">
      <Header />
      <BottomNav />

      <div className="px-5 mt-4 max-w-lg mx-auto">
        <input
          type="search"
          autoFocus
          placeholder="Buscar músicas ou artistas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 text-sm outline-none focus:border-smix-primary transition"
        />

        {!query.trim() && (
          <p className="text-smix-muted text-sm mt-6 text-center">
            Digite o nome de uma música ou de um artista para começar.
          </p>
        )}

        {loading && <p className="text-smix-muted text-sm mt-4">Buscando...</p>}

        {artists.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm text-smix-muted mb-2">Artistas</h2>
            <div className="flex flex-col gap-2">
              {artists.map((artist) => (
                <a
                  key={artist.id}
                  href={`/artistas/${artist.id}`}
                  className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 flex items-center gap-3 hover:border-smix-primary transition"
                >
                  <div className="w-9 h-9 rounded-full bg-smix-bg border border-smix-border overflow-hidden flex-shrink-0">
                    {artist.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={artist.photoUrl} alt={artist.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  {artist.name}
                </a>
              ))}
            </div>
          </section>
        )}

        {songs.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm text-smix-muted mb-2">Músicas</h2>
            <div className="flex flex-col gap-2">
              {songs.map((song) => (
                <a
                  key={song.id}
                  href={`/musicas/${song.id}`}
                  className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 flex justify-between items-center hover:border-smix-primary transition"
                >
                  <span>{song.title}</span>
                  <span className="text-smix-muted text-sm">{song.artist.name}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {!loading && query.trim() && songs.length === 0 && artists.length === 0 && (
          <p className="text-smix-muted text-sm mt-6 text-center">Nenhum resultado para "{query}"</p>
        )}
      </div>
    </main>
  );
}
