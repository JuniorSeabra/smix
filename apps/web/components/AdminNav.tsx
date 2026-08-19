'use client';

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/artistas', label: 'Artistas' },
  { href: '/admin/musicas', label: 'Músicas' },
  { href: '/admin/arquivos', label: 'Arquivos' },
  { href: '/admin/usuarios', label: 'Usuários' },
  { href: '/admin/assinaturas', label: 'Assinaturas' },
  { href: '/admin/pagamentos', label: 'Pagamentos' },
  { href: '/admin/atividade', label: 'Atividade' },
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
