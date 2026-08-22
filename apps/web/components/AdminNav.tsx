'use client';

// "Arquivos" saiu do menu: o conteúdo passa a entrar exclusivamente pela
// integração (botão "Sincronizar com o Drive", em /admin/musicas).
//
// "Assinaturas" e "Pagamentos" também saíram: a plataforma não cobra de
// ninguém. O acesso ao catálogo é liberado pelo próprio cadastro do usuário,
// em /admin/usuarios. As telas e as rotas continuam existindo, só não têm mais
// entrada no menu — quando houver cobrança de verdade, é só devolver as duas
// linhas aqui.
const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/artistas', label: 'Artistas' },
  { href: '/admin/musicas', label: 'Músicas' },
  { href: '/admin/usuarios', label: 'Usuários' },
  { href: '/admin/chat', label: 'Chat' },
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
