'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../lib/api';
import { Header } from '../../../components/Header';
import { BottomNav } from '../../../components/BottomNav';

type Song = { id: string; title: string };
type ArtistDetail = { id: string; name: string; photoUrl: string | null; songs: Song[] };

export default function ArtistPage() {
  const params = useParams<{ id: string }>();
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'error'>('loading');

  useEffect(() => {
    setStatus('loading');
    apiFetch(`/artists/${params.id}`)
      .then(async (res) => {
        if (res.status === 404) {
          setStatus('not-found');
          return;
        }
        if (!res.ok) {
          setStatus('error');
          return;
        }
        setArtist(await res.json());
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [params.id]);

  if (status === 'loading') {
    return (
      <main className="min-h-screen">
        <Header />
        <p className="px-5 text-smix-muted">Carregando...</p>
      </main>
    );
  }

  if (status === 'not-found' || status === 'error' || !artist) {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="px-5 mt-8 flex flex-col items-center gap-3 text-center">
          <p className="text-smix-muted">
            {status === 'not-found' ? 'Artista não encontrado.' : 'Não foi possível carregar este artista.'}
          </p>
          <a href="/home" className="text-smix-accent text-sm hover:underline">
            Voltar para a home
          </a>
        </div>
      </main>
    );
  }

  // Agrupa músicas pela primeira letra do título (já vêm em ordem alfabética do backend)
  const grouped = artist.songs.reduce<Record<string, Song[]>>((acc, song) => {
    const letter = song.title[0]?.toUpperCase() ?? '#';
    acc[letter] = acc[letter] ?? [];
    acc[letter].push(song);
    return acc;
  }, {});

  return (
    <main className="min-h-screen pb-28">
      <Header />
      <BottomNav />

      <div className="relative h-40 md:h-56 -mt-1">
        {artist.photoUrl ? (
          <>
            {/* Foto do artista como fundo, com um overlay leve (brightness+gradiente) —
                vibrante o bastante pra não "sumir", escuro só onde o texto precisa de contraste. */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${artist.photoUrl})`, filter: 'brightness(0.9) contrast(1.05)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-smix-bg via-smix-bg/25 to-transparent" />
          </>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br from-smix-primary/30 to-smix-accent/20`} />
        )}

        <div className="absolute bottom-0 left-0 px-5 pb-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-smix-surface border-2 border-smix-bg overflow-hidden flex-shrink-0 shadow-lg">
            {artist.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artist.photoUrl} alt={artist.name} className="w-full h-full object-cover" />
            )}
          </div>
          <h1 className="text-2xl font-bold drop-shadow-md">{artist.name}</h1>
        </div>
      </div>

      <div className="px-5 mt-6 flex flex-col gap-6">
        {Object.entries(grouped).map(([letter, songs]) => (
          <div key={letter}>
            <h2 className="text-smix-accent font-semibold mb-2">{letter}</h2>
            <div className="flex flex-col gap-2">
              {songs.map((song) => (
                <a
                  key={song.id}
                  href={`/musicas/${song.id}`}
                  className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 hover:border-smix-primary transition"
                >
                  {song.title}
                </a>
              ))}
            </div>
          </div>
        ))}
        {artist.songs.length === 0 && (
          <p className="text-smix-muted text-sm">Nenhuma música cadastrada ainda para este artista.</p>
        )}
      </div>
    </main>
  );
}
