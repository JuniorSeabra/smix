'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';

type Message = { id: string; content: string; senderId: string; createdAt: string; isMine: boolean };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
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

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000); // polling simples até termos WebSocket
    return () => clearInterval(interval);
  }, []);

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

      {/* max-w-sm no celular (o desenho original), mas solto a partir de md: a
          coluna travada em 384px numa tela de PC deixava a caixa de texto e o
          botão Enviar espremidos num canto, desproporcionais ao resto da página.
          A tela do admin nunca teve esse problema porque o painel dela cresce. */}
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
    </main>
  );
}
