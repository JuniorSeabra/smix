'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { AdminNav } from '../../../components/AdminNav';
import { AdminBottomNav } from '../../../components/AdminBottomNav';

type ConversationSummary = {
  id: string;
  status: string;
  user: { id: string; name: string; email: string } | null;
  messageCount: number;
  lastMessage: { content: string; createdAt: string } | null;
  updatedAt: string;
  expiresAt: string;
};

type ChatMessage = {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  fromAdmin: boolean;
  createdAt: string;
};

type ConversationDetail = {
  id: string;
  status: string;
  user: { id: string; name: string; email: string } | null;
  messages: ChatMessage[];
};

// "some em 12h" é mais útil pro admin do que a data crua: o que importa é
// quanto tempo ainda resta antes da exclusão automática.
function timeLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expirando';
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `some em ${hours}h`;
  return `some em ${Math.max(1, Math.floor(ms / 60_000))}min`;
}

export default function AdminChatPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadConversations() {
    const res = await apiFetch('/chat/admin/conversations');
    if (res.ok) {
      const data: ConversationSummary[] = await res.json();
      setConversations(data);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    } else if (res.status === 403) {
      setError('Acesso restrito a administradores.');
    }
  }

  async function loadDetail(id: string) {
    const res = await apiFetch(`/chat/admin/conversations/${id}`);
    if (res.ok) setDetail(await res.json());
    else if (res.status === 404) {
      // A conversa pode ter expirado enquanto a tela estava aberta.
      setDetail(null);
      setSelectedId(null);
      loadConversations();
    }
  }

  // Polling: sem WebSocket ainda, mas 4s dá sensação de tempo real e não pesa,
  // já que a resposta é pequena.
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    loadDetail(selectedId);
    const interval = setInterval(() => loadDetail(selectedId), 4000);
    return () => clearInterval(interval);
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !selectedId) return;
    setSending(true);
    try {
      const res = await apiFetch(`/chat/admin/conversations/${selectedId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) throw new Error('Não foi possível enviar a mensagem.');
      setText('');
      await loadDetail(selectedId);
      loadConversations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteConversation(conversation: ConversationSummary) {
    const who = conversation.user?.name ?? 'este usuário';
    if (!window.confirm(`Excluir agora a conversa com ${who}? Todas as mensagens somem — não é reversível.`)) {
      return;
    }
    const res = await apiFetch(`/chat/admin/conversations/${conversation.id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError('Não foi possível excluir a conversa.');
      return;
    }
    if (selectedId === conversation.id) {
      setSelectedId(null);
      setDetail(null);
    }
    loadConversations();
  }

  async function handleDeleteMessage(message: ChatMessage) {
    if (!window.confirm('Excluir esta mensagem?')) return;
    const res = await apiFetch(`/chat/admin/messages/${message.id}`, { method: 'DELETE' });
    if (res.ok && selectedId) loadDetail(selectedId);
  }

  return (
    <main className="min-h-screen px-5 md:px-6 py-8 max-w-5xl mx-auto pb-28">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Chat de suporte</h1>
        <AdminNav current="/admin/chat" />
      </div>

      <p className="text-smix-muted text-xs mb-6">
        As conversas ficam guardadas por 48 horas e são excluídas automaticamente depois disso. Você
        também pode excluir na hora, a qualquer momento.
      </p>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="grid md:grid-cols-[minmax(0,300px)_1fr] gap-4">
        {/* Fila de conversas */}
        <aside className="flex flex-col gap-2 md:max-h-[70vh] md:overflow-y-auto">
          {conversations.length === 0 && (
            <p className="text-smix-muted text-sm">Nenhuma conversa aberta no momento.</p>
          )}
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`rounded-xl2 border px-4 py-3 text-sm transition ${
                conversation.id === selectedId
                  ? 'bg-smix-surface border-smix-accent'
                  : 'bg-smix-surface border-smix-border hover:border-smix-muted'
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedId(conversation.id)}
                className="w-full text-left"
              >
                <p className="font-medium truncate">{conversation.user?.name ?? 'Usuário removido'}</p>
                <p className="text-smix-muted text-xs truncate">{conversation.user?.email}</p>
                {conversation.lastMessage && (
                  <p className="text-smix-muted text-xs mt-1 truncate">{conversation.lastMessage.content}</p>
                )}
              </button>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-smix-muted">
                  {conversation.messageCount} msg · {timeLeft(conversation.expiresAt)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteConversation(conversation)}
                  className="text-[11px] text-red-400 hover:underline"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </aside>

        {/* Conversa aberta */}
        <section className="rounded-xl2 bg-smix-surface border border-smix-border flex flex-col min-h-[50vh] md:max-h-[70vh]">
          {!detail && (
            <p className="text-smix-muted text-sm m-auto px-4 text-center">
              Selecione uma conversa para responder.
            </p>
          )}

          {detail && (
            <>
              <div className="px-4 py-3 border-b border-smix-border">
                <p className="text-sm font-medium">{detail.user?.name ?? 'Usuário removido'}</p>
                <p className="text-smix-muted text-xs">{detail.user?.email}</p>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
                {detail.messages.length === 0 && (
                  <p className="text-smix-muted text-sm text-center my-auto">
                    Nenhuma mensagem nesta conversa.
                  </p>
                )}
                {detail.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`group max-w-[85%] ${message.fromAdmin ? 'self-end' : 'self-start'}`}
                  >
                    <div
                      className={`rounded-xl2 px-4 py-2 text-sm ${
                        message.fromAdmin ? 'bg-smix-primary' : 'bg-smix-bg border border-smix-border'
                      }`}
                    >
                      {message.content}
                    </div>
                    <div
                      className={`flex items-center gap-2 mt-1 text-[10px] text-smix-muted ${
                        message.fromAdmin ? 'justify-end' : ''
                      }`}
                    >
                      <span>{new Date(message.createdAt).toLocaleString('pt-BR')}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(message)}
                        className="text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition hover:underline"
                      >
                        excluir
                      </button>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-smix-border">
                <input
                  type="text"
                  placeholder="Responder..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="flex-1 rounded-xl2 bg-smix-bg border border-smix-border px-4 py-3 text-sm outline-none focus:border-smix-accent transition"
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="rounded-xl2 bg-smix-primary px-5 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                >
                  Enviar
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      <AdminBottomNav current="/admin/chat" />
    </main>
  );
}
