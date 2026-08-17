'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';
import { InstrumentIcon, INSTRUMENTS } from '../../components/InstrumentIcon';
import { InstrumentBackdrop } from '../../components/InstrumentBackdrop';

type Artist = { id: string; name: string; photoUrl: string | null };
type SongResult = { id: string; title: string; artist: { name: string } };

const FALLBACK_NAMES = [
  'Aline Barros', 'Gabriela Rocha', 'Fernandinho', 'Isadora Pompeo',
  'Anderson Freire', 'Bruna Karla', 'Thalles Roberto', 'Isaias Saad',
  'Fernanda Brum', 'Cassiane', 'Julliany Souza', 'Gabriel Guedes',
];
const FALLBACK_ARTISTS: Artist[] = FALLBACK_NAMES.map((name, i) => ({
  id: `fallback-${i}`,
  name,
  photoUrl: null,
}));

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

const GRADIENTS = [
  'from-smix-primary to-smix-accent',
  'from-smix-accent to-smix-primary',
  'from-purple-500 to-smix-accent',
  'from-smix-primary to-cyan-400',
];

export default function HomePage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    apiFetch('/artists')
      .then((res) => res.json())
      .then((data) => setArtists(Array.isArray(data) && data.length > 0 ? data : FALLBACK_ARTISTS))
      .catch(() => setArtists(FALLBACK_ARTISTS));
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
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <main className="min-h-screen pb-24">
      <Header />
      <BottomNav />

      <div className="px-5 mt-4">
        <input
          type="search"
          placeholder="Buscar músicas ou artistas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl2 bg-smix-surface/80 backdrop-blur border border-smix-border px-4 py-3 text-sm outline-none focus:border-smix-accent transition"
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
                className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 flex justify-between items-center hover:border-smix-accent transition"
              >
                <span>{song.title}</span>
                <span className="text-smix-muted text-sm">{song.artist.name}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {!query.trim() && (
        <section className="relative mt-8 py-4">
          <InstrumentBackdrop />
          <h2 className="px-5 text-sm text-smix-muted mb-3">Artistas</h2>

          {/* Mobile/tablet: ~5 visíveis por vez. Desktop: ~8 visíveis. Arraste para o lado para ver mais. */}
          <div className="flex gap-3 md:gap-4 overflow-x-auto px-5 pb-2 snap-x snap-mandatory scrollbar-hide scroll-smooth">
            {artists.map((artist, i) => {
              const instrument = INSTRUMENTS[i % INSTRUMENTS.length];
              return (
                <a
                  key={artist.id}
                  href={`/artistas/${artist.id}`}
                  className="flex-shrink-0 w-[18%] md:w-[11%] min-w-[64px] flex flex-col items-center gap-2 snap-start group"
                >
                  <div className="relative">
                    <div
                      className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden flex items-center justify-center text-base md:text-lg font-semibold bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} group-hover:scale-105 transition-transform shadow-lg`}
                    >
                      {artist.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={artist.photoUrl} alt={artist.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white/90">{initials(artist.name)}</span>
                      )}
                    </div>
                    {/* Selo de instrumento — dá vida e diferencia cada card */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-smix-bg border border-smix-border flex items-center justify-center p-1">
                      <InstrumentIcon type={instrument} className="w-full h-full" />
                    </div>
                  </div>
                  <span className="text-xs text-center text-smix-muted line-clamp-2">{artist.name}</span>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
