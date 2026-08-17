'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../lib/api';
import { Header } from '../../../components/Header';
import { BottomNav } from '../../../components/BottomNav';

type FileItem = { id: string; name: string; type: string };
type SongDetail = {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  artist: { id: string; name: string };
  files: FileItem[];
};

export default function SongPage() {
  const params = useParams<{ id: string }>();
  const [song, setSong] = useState<SongDetail | null>(null);
  const [downloadState, setDownloadState] = useState<Record<string, 'idle' | 'loading' | 'error'>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/songs/${params.id}`)
      .then((res) => res.json())
      .then(setSong)
      .catch(() => setSong(null));
  }, [params.id]);

  async function handleDownload(fileId: string) {
    setErrorMsg(null);
    setDownloadState((prev) => ({ ...prev, [fileId]: 'loading' }));
    try {
      const res = await apiFetch(`/files/${fileId}/download`);
      if (res.status === 403) {
        throw new Error('Você precisa de uma assinatura ativa para baixar este arquivo.');
      }
      if (!res.ok) {
        throw new Error('Não foi possível iniciar o download.');
      }
      const data = await res.json();
      // Backend retorna a URL segura/temporária — nunca o link direto do Drive
      window.open(data.downloadUrl, '_blank');
      setDownloadState((prev) => ({ ...prev, [fileId]: 'idle' }));
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao baixar arquivo');
      setDownloadState((prev) => ({ ...prev, [fileId]: 'error' }));
    }
  }

  if (!song) {
    return (
      <main className="min-h-screen">
        <Header />
        <p className="px-5 text-smix-muted">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24 md:pb-8">
      <Header />
      <BottomNav />

      <div className="px-5 mt-4 flex flex-col gap-4 max-w-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl2 bg-smix-surface border border-smix-border overflow-hidden flex-shrink-0">
            {song.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold">{song.title}</h1>
            <a href={`/artistas/${song.artist.id}`} className="text-smix-accent text-sm hover:underline">
              {song.artist.name}
            </a>
          </div>
        </div>

        {song.description && <p className="text-smix-muted text-sm">{song.description}</p>}

        {errorMsg && (
          <p className="text-red-400 text-sm rounded-xl2 bg-red-950/30 border border-red-900 px-4 py-3">
            {errorMsg}
          </p>
        )}

        <div className="flex flex-col gap-2 mt-2">
          {song.files.length === 0 && (
            <p className="text-smix-muted text-sm">Nenhum arquivo disponível para esta música ainda.</p>
          )}
          {song.files.map((file) => {
            const state = downloadState[file.id] ?? 'idle';
            return (
              <div
                key={file.id}
                className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm">{file.name}</p>
                  <p className="text-smix-muted text-xs">{file.type}</p>
                </div>
                <button
                  onClick={() => handleDownload(file.id)}
                  disabled={state === 'loading'}
                  className="rounded-xl2 bg-smix-primary px-4 py-2 text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
                >
                  {state === 'loading' ? 'Baixando...' : 'Download'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
