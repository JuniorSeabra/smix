'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../lib/api';
import { Header } from '../../../components/Header';
import { BottomNav } from '../../../components/BottomNav';

type FileItem = { id: string; name: string; type: string; size?: number | null };
type SongDetail = {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  artist: { id: string; name: string };
  files: FileItem[];
};

// Não dá pra mostrar porcentagem de download aqui, e o motivo é o mesmo que
// mantém o site no ar: o arquivo vem direto do Google, não do nosso servidor.
// O navegador é quem baixa, e o JavaScript da página não tem como ler o
// progresso de uma resposta de outro domínio — o Google não libera isso (CORS).
//
// Para haver porcentagem, os bytes teriam que passar por dentro da nossa API,
// que foi exatamente o que estourou a cota de banda e derrubou o serviço em
// 20/08/2026. Um multitrack de 800MB por download acabava com o mês.
//
// O que dá pra fazer, e é o que está aqui: dizer o tamanho antes de começar,
// avisar quando o download efetivamente saiu, e mandar o músico olhar a barra
// do próprio navegador, que mostra progresso de verdade.
function formatarTamanho(bytes?: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export default function SongPage() {
  const params = useParams<{ id: string }>();
  const [song, setSong] = useState<SongDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  const [downloadState, setDownloadState] = useState<
    Record<string, 'idle' | 'loading' | 'iniciado' | 'error'>
  >({});
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

  // O backend não entrega mais os bytes do arquivo, só um link temporário do
  // Drive — então aqui não há mais o que medir: quem baixa é o próprio
  // navegador, com a barra de progresso nativa dele. A versão anterior lia o
  // corpo em pedaços pra montar um Blob, o que além de gastar a banda do
  // servidor ainda carregava um multitrack de centenas de MB inteiro na memória
  // do celular antes de salvar.
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

      const { url } = await res.json();
      if (!url) throw new Error('Não foi possível iniciar o download.');

      // Navegação direta, fora do fetch: o link é de outro domínio (Google) e
      // precisa ser o navegador a buscá-lo, senão o CORS bloqueia. Um <a download>
      // não serviria — o atributo download é ignorado em link cross-origin.
      window.location.href = url;

      // Marca como iniciado em vez de voltar pra 'idle': o botão voltando na
      // hora pra "Download" dava a impressão de que nada tinha acontecido,
      // porque o download acontece na barra do navegador e não na página.
      setDownloadState((prev) => ({ ...prev, [fileId]: 'iniciado' }));
      setTimeout(() => {
        setDownloadState((prev) => (prev[fileId] === 'iniciado' ? { ...prev, [fileId]: 'idle' } : prev));
      }, 8000);
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
            return (
              <div
                key={file.id}
                className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{file.name}</p>
                    <p className="text-smix-muted text-xs">
                      {file.type}
                      {formatarTamanho(file.size) && ` · ${formatarTamanho(file.size)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload(file.id)}
                    disabled={state === 'loading'}
                    className="shrink-0 rounded-xl2 bg-smix-primary px-4 py-2 text-xs font-medium hover:opacity-90 transition disabled:opacity-50 min-w-[96px]"
                  >
                    {state === 'loading' ? 'Preparando...' : state === 'iniciado' ? 'Baixando ✓' : 'Download'}
                  </button>
                </div>

                {state === 'iniciado' && (
                  <p className="text-smix-muted text-xs mt-2">
                    Download começou. O progresso aparece na barra de downloads do navegador.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
