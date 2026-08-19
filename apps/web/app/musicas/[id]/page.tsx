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
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  const [downloadState, setDownloadState] = useState<Record<string, 'idle' | 'loading' | 'error'>>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setStatus('loading');
    apiFetch(`/songs/${params.id}`)
      .then(async (res) => {
        if (res.status === 404) {
          setStatus('not-found');
          return;
        }
        if (!res.ok) {
          setStatus('error');
          return;
        }
        setSong(await res.json());
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [params.id]);

  async function handleDownload(fileId: string) {
    setErrorMsg(null);
    setDownloadState((prev) => ({ ...prev, [fileId]: 'loading' }));
    setDownloadProgress((prev) => ({ ...prev, [fileId]: 0 }));
    try {
      const res = await apiFetch(`/files/${fileId}/download`);
      if (res.status === 403) {
        throw new Error('Você precisa de uma assinatura ativa para baixar este arquivo.');
      }
      if (!res.ok) {
        throw new Error('Não foi possível iniciar o download.');
      }

      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = /filename="?([^"]+)"?/.exec(disposition);
      const fileName = match ? decodeURIComponent(match[1]) : 'download';
      const totalSize = Number(res.headers.get('Content-Length') ?? 0);

      // Lê o corpo em pedaços pra atualizar uma barra de progresso real —
      // arquivo de multitrack costuma ter centenas de MB, e sem isso o
      // download parece travado por 1-2 minutos sem nenhum feedback.
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          if (totalSize > 0) {
            setDownloadProgress((prev) => ({ ...prev, [fileId]: Math.round((received / totalSize) * 100) }));
          }
        }
      }

      const blob = chunks.length > 0 ? new Blob(chunks as BlobPart[]) : await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      setDownloadState((prev) => ({ ...prev, [fileId]: 'idle' }));
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao baixar arquivo');
      setDownloadState((prev) => ({ ...prev, [fileId]: 'error' }));
    }
  }

  if (status === 'loading') {
    return (
      <main className="min-h-screen">
        <Header />
        <p className="px-5 text-smix-muted">Carregando...</p>
      </main>
    );
  }

  if (status === 'not-found' || status === 'error' || !song) {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="px-5 mt-8 flex flex-col items-center gap-3 text-center">
          <p className="text-smix-muted">
            {status === 'not-found' ? 'Música não encontrada.' : 'Não foi possível carregar esta música.'}
          </p>
          <a href="/home" className="text-smix-accent text-sm hover:underline">
            Voltar para a home
          </a>
        </div>
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
            const progress = downloadProgress[file.id] ?? 0;
            return (
              <div
                key={file.id}
                className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">{file.name}</p>
                    <p className="text-smix-muted text-xs">{file.type}</p>
                  </div>
                  <button
                    onClick={() => handleDownload(file.id)}
                    disabled={state === 'loading'}
                    className="rounded-xl2 bg-smix-primary px-4 py-2 text-xs font-medium hover:opacity-90 transition disabled:opacity-50 min-w-[84px]"
                  >
                    {state === 'loading' ? `${progress}%` : 'Download'}
                  </button>
                </div>
                {state === 'loading' && (
                  <div className="mt-2 h-1.5 rounded-full bg-smix-bg overflow-hidden">
                    <div
                      className="h-full bg-smix-accent transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
