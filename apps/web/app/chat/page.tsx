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
      // backend do chat ainda não implementado — tela funciona vazia por enquanto
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

      <div className="px-5 mt-4 flex-1 flex flex-col max-w-sm w-full mx-auto">
        <h1 className="text-xl font-bold mb-4">Suporte</h1>

        <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-[300px]">
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

        <form onSubmit={handleSend} className="flex gap-2 mt-4">
          <input
            type="text"
            placeholder="Escreva sua mensagem..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 text-sm outline-none focus:border-smix-primary transition"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded-xl2 bg-smix-primary px-5 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
      </div>
    </main>
  );
}
