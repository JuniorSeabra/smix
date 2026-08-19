'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';
import { InstrumentIcon, INSTRUMENTS } from '../../components/InstrumentIcon';
import { InstrumentBackdrop } from '../../components/InstrumentBackdrop';

type Artist = { id: string; name: string; photoUrl: string | null };
type SongResult = { id: string; title: string; artist: { name: string } };

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

  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ dragging: boolean; startX: number; startScrollLeft: number; moved: boolean }>({
    dragging: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });

  // Arrastar com o mouse no desktop (não tem trackpad/scroll horizontal óbvio).
  function handleMouseDown(e: React.MouseEvent) {
    const el = scrollerRef.current;
    if (!el) return;
    dragState.current = { dragging: true, startX: e.pageX, startScrollLeft: el.scrollLeft, moved: false };
  }
  function handleMouseMove(e: React.MouseEvent) {
    const el = scrollerRef.current;
    if (!el || !dragState.current.dragging) return;
    const delta = e.pageX - dragState.current.startX;
    if (Math.abs(delta) > 3) dragState.current.moved = true;
    el.scrollLeft = dragState.current.startScrollLeft - delta;
  }
  function endDrag() {
    dragState.current.dragging = false;
  }
  // Evita que o "arraste" vire clique acidental no artista.
  function handleClickCapture(e: React.MouseEvent) {
    if (dragState.current.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // Seta: avança ~3 cantores por clique.
  function scrollByCards(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('a');
    const cardWidth = card ? card.offsetWidth + 16 : 96;
    el.scrollBy({ left: direction * cardWidth * 3, behavior: 'smooth' });
  }

  useEffect(() => {
    // Só mostra cantor se estiver de verdade cadastrado no banco pelo admin —
    // nunca inventa nome de exemplo. Ver /admin/artistas para cadastrar.
    apiFetch('/artists')
      .then((res) => res.json())
      .then((data) => setArtists(Array.isArray(data) ? data : []))
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

          {artists.length === 0 && (
            <p className="px-5 text-smix-muted text-sm">
              Nenhum cantor cadastrado ainda — vá em Painel Admin → Artistas para adicionar.
            </p>
          )}

          {/* Mobile/tablet: ~5 visíveis por vez, arraste com o dedo. Desktop: ~8 visíveis,
              arraste com o mouse ou use as setas. */}
          {artists.length > 0 && (
          <div className="relative group/carousel">
            <div
              ref={scrollerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={endDrag}
              onMouseLeave={endDrag}
              onClickCapture={handleClickCapture}
              className="flex gap-3 md:gap-4 overflow-x-auto px-5 pb-2 snap-x snap-mandatory scrollbar-hide scroll-smooth cursor-grab active:cursor-grabbing select-none"
            >
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
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-smix-bg border border-smix-border overflow-hidden">
                      <InstrumentIcon type={instrument} width={48} className="w-full h-full rounded-full" />
                    </div>
                  </div>
                  <span className="text-xs text-center text-smix-muted line-clamp-2">{artist.name}</span>
                  </a>
                );
              })}
            </div>

            {/* Setas: só no desktop (mobile já arrasta com o dedo naturalmente) */}
            <button
              type="button"
              aria-label="Ver cantores anteriores"
              onClick={() => scrollByCards(-1)}
              className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-smix-surface/90 border border-smix-border items-center justify-center text-smix-text opacity-0 group-hover/carousel:opacity-100 transition hover:border-smix-accent"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Ver mais cantores"
              onClick={() => scrollByCards(1)}
              className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-smix-surface/90 border border-smix-border items-center justify-center text-smix-text opacity-0 group-hover/carousel:opacity-100 transition hover:border-smix-accent"
            >
              ›
            </button>
          </div>
          )}
        </section>
      )}

      {!query.trim() && (
        <section className="relative mt-10 mx-5 rounded-xl2 overflow-hidden border border-smix-border">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1483000805330-4eaf0a0d82da?auto=format&fit=crop&w=1200&q=70)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-smix-bg via-smix-bg/80 to-smix-bg/20" />

          <div className="relative px-6 py-8 md:py-12 max-w-md">
            <span className="text-smix-accent text-xs font-semibold tracking-wide uppercase">
              S-MIX MultiTracks
            </span>
            <h2 className="text-xl md:text-2xl font-bold mt-2 leading-snug">
              Tenha suas tracks sempre com você.
            </h2>
            <p className="text-smix-muted text-sm mt-2">
              Acesse seus multitracks de qualquer dispositivo, na hora do ensaio ou do culto.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
