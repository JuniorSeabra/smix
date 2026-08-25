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
  // null = ainda não sabemos o cargo. A tela do usuário aparece de qualquer
  // forma nesse estado; só o polling espera. Ver o efeito abaixo.
  const [ehAdmin, setEhAdmin] = useState<boolean | null>(null);
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
  // Não bloqueia a tela enquanto a resposta não chega: se a API estiver lenta ou
  // fora do ar, o usuário comum veria "Carregando..." para sempre. Só o polling
  // espera; a interface aparece na hora, e o redirecionamento acontece depois
  // caso o cargo seja ADMIN.
  //
  // O timeout existe pelo mesmo motivo: sem ele, uma requisição pendurada
  // deixaria o chat do usuário mudo, sem nunca carregar mensagem nenhuma.
  useEffect(() => {
    let ativo = true;
    const desistirEm = setTimeout(() => {
      if (ativo) setEhAdmin((atual) => (atual === null ? false : atual));
    }, 4000);

    apiFetch('/users/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((perfil) => {
        if (!ativo) return;
        const admin = perfil?.role === 'ADMIN';
        setEhAdmin(admin);
        if (admin) router.replace('/admin/chat');
      })
      .catch(() => {
        if (ativo) setEhAdmin(false);
      });

    return () => {
      ativo = false;
      clearTimeout(desistirEm);
    };
  }, [router]);

  useEffect(() => {
    // Só busca mensagem depois de confirmar que NÃO é admin. /chat/conversation
    // cria a conversa de suporte no primeiro acesso, e um admin passando por
    // aqui viraria cliente na própria fila de atendimento.
    if (ehAdmin !== false) return;
    loadMessages();
    const interval = setInterval(loadMessages, 5000); // polling simples até termos WebSocket
    return () => clearInterval(interval);
  }, [ehAdmin]);

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

  // pb-28 em todas as larguras, sem md:pb-8.
  //
  // A BottomNav é `fixed bottom-0` e NÃO some no desktop — não tem md:hidden.
  // O md:pb-8 reservava 32px pra uma barra de ~60px, então no PC ela cobria o
  // fim da página. Aqui o fim da página é justamente o campo de digitar, que por
  // isso sumia. As telas do admin já usavam pb-28 e por isso sempre couberam.
  return (
    <main className="min-h-screen flex flex-col pb-28">
      <Header />
      <BottomNav />

      {/* Admin vê só esta linha durante o instante do redirecionamento. */}
      {ehAdmin === true && (
        <div className="px-5 mt-10 text-center">
          <p className="text-smix-muted text-sm">Abrindo a fila de atendimento...</p>
        </div>
      )}
      {/* max-w-sm no celular (o desenho original), mas solto a partir de md: a
          coluna travada em 384px numa tela de PC deixava a caixa de texto e o
          botão Enviar espremidos num canto, desproporcionais ao resto da página.
          A tela do admin nunca teve esse problema porque o painel dela cresce. */}
      {ehAdmin !== true && (
      <div className="px-5 mt-4 flex-1 flex flex-col w-full max-w-sm md:max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-1">Suporte</h1>
        <p className="text-smix-muted text-xs mb-4">
          As mensagens ficam guardadas por 48 horas e depois são apagadas automaticamente.
        </p>

        {/* min-h baixo de propósito: quem dá altura à lista é o flex-1, e é ela
            que rola. Um min-height grande empurrava o formulário pra baixo da
            dobra no PC, obrigando a rolar a página pra achar o campo. */}
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-[180px]">
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
        <form onSubmit={handleSend} className="shrink-0 flex items-stretch gap-2 mt-4">
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
