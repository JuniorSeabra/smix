'use client';

// Navegação inferior do Admin, pensada pro celular (o menu do topo fica longe
// do polegar). "Início" é a própria saída do admin — por isso não existe mais
// um "Voltar ao app" duplicado aqui, nem "Painel", que só repetia a tela atual.
// O "Voltar ao app" do topo (AdminNav) continua existindo.
const ITEMS = [
  { href: '/home', label: 'Início', icon: '🏠' },
  { href: '/admin/musicas', label: 'Músicas', icon: '🎵' },
  { href: '/admin/chat', label: 'Chat', icon: '💬' },
  { href: '/admin/atividade', label: 'Atividade', icon: '📊' },
];

export function AdminBottomNav({ current }: { current?: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-smix-surface/90 backdrop-blur border-t border-smix-border z-20 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-stretch max-w-3xl mx-auto py-2">
        {ITEMS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] md:text-xs px-2 md:px-4 py-1 transition ${
              item.href === current ? 'text-smix-accent' : 'text-smix-muted hover:text-smix-accent'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="whitespace-nowrap">{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
