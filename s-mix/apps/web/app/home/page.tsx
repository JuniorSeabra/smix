'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';

type Artist = { id: string; name: string; photoUrl: string | null };
type SongResult = { id: string; title: string; artist: { name: string } };

export default function HomePage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    apiFetch('/artists')
      .then((res) => res.json())
      .then(setArtists)
      .catch(() => setArtists([]));
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiFetch(`/songs/search?q=${encodeURIComponent(query)}`);
        setResults(await res.json());
      } finally {
        setSearching(false);
      }
    }, 300); // debounce
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <main className="min-h-screen pb-24 md:pb-8">
      <Header />
      <BottomNav />

      <div className="px-5 mt-4">
        <input
          type="search"
          placeholder="Buscar músicas ou artistas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 text-sm outline-none focus:border-smix-primary transition"
        />

        {query.trim() && (
          <div className="mt-3 flex flex-col gap-2">
            {searching && <p className="text-smix-muted text-sm">Buscando...</p>}
            {!searching && results.length === 0 && (
              <p className="text-smix-muted text-sm">Nenhum resultado para "{query}"</p>
            )}
            {results.map((song) => (
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
        )}
      </div>

      {!query.trim() && (
        <section className="mt-8">
          <h2 className="px-5 text-sm text-smix-muted mb-3">Artistas</h2>
          <div className="flex gap-4 overflow-x-auto px-5 pb-2 snap-x snap-mandatory scrollbar-hide">
            {artists.map((artist) => (
              <a
                key={artist.id}
                href={`/artistas/${artist.id}`}
                className="flex-shrink-0 w-20 flex flex-col items-center gap-2 snap-start"
              >
                <div className="w-20 h-20 rounded-full bg-smix-surface border border-smix-border overflow-hidden">
                  {artist.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={artist.photoUrl} alt={artist.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <span className="text-xs text-center text-smix-muted line-clamp-2">{artist.name}</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
