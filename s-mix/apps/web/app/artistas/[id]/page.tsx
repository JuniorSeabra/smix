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

  useEffect(() => {
    apiFetch(`/artists/${params.id}`)
      .then((res) => res.json())
      .then(setArtist)
      .catch(() => setArtist(null));
  }, [params.id]);

  if (!artist) {
    return (
      <main className="min-h-screen">
        <Header />
        <p className="px-5 text-smix-muted">Carregando...</p>
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
    <main className="min-h-screen pb-24 md:pb-8">
      <Header />
      <BottomNav />

      <div className="px-5 mt-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-smix-surface border border-smix-border overflow-hidden flex-shrink-0">
          {artist.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artist.photoUrl} alt={artist.name} className="w-full h-full object-cover" />
          )}
        </div>
        <h1 className="text-2xl font-bold">{artist.name}</h1>
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
