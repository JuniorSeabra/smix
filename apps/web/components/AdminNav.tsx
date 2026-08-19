'use client';

// "Arquivos" saiu do menu: o conteúdo passa a entrar exclusivamente pela
// integração (botão "Sincronizar com o Drive", em /admin/musicas).
const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/artistas', label: 'Artistas' },
  { href: '/admin/musicas', label: 'Músicas' },
  { href: '/admin/usuarios', label: 'Usuários' },
  { href: '/admin/assinaturas', label: 'Assinaturas' },
  { href: '/admin/pagamentos', label: 'Pagamentos' },
  { href: '/admin/atividade', label: 'Atividade' },
  { href: '/home', label: 'Voltar ao app' },
];

export function AdminNav({ current }: { current: string }) {
  return (
    <nav className="flex gap-4 text-sm text-smix-muted flex-wrap">
      {LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className={link.href === current ? 'text-smix-text' : 'hover:text-smix-text transition'}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
