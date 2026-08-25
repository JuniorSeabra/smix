'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';

type Message = { id: string; content: string; senderId: string; createdAt: string; isMine: boolean };

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  // 'checando' até sabermos o cargo. Ver o efeito abaixo — o polling não pode
  // começar antes disso.
  const [modo, setModo] = useState<'checando' | 'usuario'>('checando');
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    try {
      const res = await apiFetch('/chat/conversation');
      if (res.ok) setMessages(await res.json());
    } catch {
      // Rede fora do ar: mantém na tela o que já foi carregado em vez de
      // esvaziar a conversa — o próximo ciclo do polling tenta de novo.
    }
  }

  // Admin que entra em "Chat" vai direto pra fila de atendimento, que é o que
  // ele realmente quer ver — a tela de suporte do usuário não serve pra ele.
  //
  // A checagem precisa vir ANTES de qualquer chamada a /chat/conversation: esse
  // endpoint cria a conversa de suporte do usuário no primeiro acesso, então um
  // admin abrindo esta página apareceria como cliente na própria lista de
  // atendimentos, com uma conversa vazia que ele teria que apagar na mão.
  //
  // Isto é conveniência de navegação, não permissão: quem decide o que o admin
  // pode ver continua sendo o RolesGuard no backend. Um usuário comum que chegue
  // em /admin/chat por conta própria leva 403 da API do mesmo jeito.
  useEffect(() => {
    let ativo = true;
    apiFetch('/users/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((perfil) => {
        if (!ativo) return;
        if (perfil?.role === 'ADMIN') {
          router.replace('/admin/chat');
          return;
        }
        setModo('usuario');
      })
      .catch(() => {
        if (ativo) setModo('usuario');
      });
    return () => {
      ativo = false;
    };
  }, [router]);

  useEffect(() => {
    if (modo !== 'usuario') return;
    loadMessages();
    const interval = setInterval(loadMessages, 5000); // polling simples até termos WebSocket
    return () => clearInterval(interval);
  }, [modo]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await apiFetch('/chat/conversation/messages', {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });
      setText('');
      await loadMessages();
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col pb-24 md:pb-8">
      <Header />
      <BottomNav />

      {/* Sem isto a tela de suporte piscava por um instante antes de o admin ser
          levado pra fila de atendimento. */}
      {modo === 'checando' && (
        <div className="px-5 mt-10 text-center">
          <p className="text-smix-muted text-sm">Carregando...</p>
        </div>
      )}
      {/* max-w-sm no celular (o desenho original), mas solto a partir de md: a
          coluna travada em 384px numa tela de PC deixava a caixa de texto e o
          botão Enviar espremidos num canto, desproporcionais ao resto da página.
          A tela do admin nunca teve esse problema porque o painel dela cresce. */}
      {modo === 'usuario' && (
      <div className="px-5 mt-4 flex-1 flex flex-col w-full max-w-sm md:max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-1">Suporte</h1>
        <p className="text-smix-muted text-xs mb-4">
          As mensagens ficam guardadas por 48 horas e depois são apagadas automaticamente.
        </p>

        <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-[300px] md:min-h-[420px]">
          {messages.length === 0 && (
            <p className="text-smix-muted text-sm text-center mt-8">
              Envie uma mensagem para o administrador tirar suas dúvidas.
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-xl2 px-4 py-2 text-sm max-w-[80%] ${
                msg.isMine
                  ? 'bg-smix-primary self-end'
                  : 'bg-smix-surface border border-smix-border self-start'
              }`}
            >
              {msg.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* min-w-0 no input e shrink-0 no botão: item flex tem largura mínima
            igual ao conteúdo por padrão, então uma mensagem longa empurrava o
            botão pra fora da tela no celular em vez de o campo rolar por dentro. */}
        <form onSubmit={handleSend} className="flex items-stretch gap-2 mt-4">
          <input
            type="text"
            placeholder="Escreva sua mensagem..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 min-w-0 rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 text-sm outline-none focus:border-smix-primary transition"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="shrink-0 whitespace-nowrap rounded-xl2 bg-smix-primary px-5 py-3 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
      </div>
      )}
    </main>
  );
}
