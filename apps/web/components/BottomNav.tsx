'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

// "Mixagem" saiu do menu por ora: a tela existe em /mixagem mas ainda vai ser
// retrabalhada, e no estado atual só confunde quem abre. Devolver a linha aqui
// basta pra ela voltar.
const ITEMS = [
  { href: '/home', label: 'Início', icon: '🏠' },
  { href: '/explore', label: 'Explore', icon: '🔍' },
  { href: '/afinador', label: 'Afinador', icon: '🎵' },
  { href: '/chat', label: 'Chat', icon: '💬' },
];

const ADMIN_ITEM = { href: '/admin', label: 'Admin', icon: '⚙️' };

export function BottomNav() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    apiFetch('/users/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsAdmin(data?.role === 'ADMIN'))
      .catch(() => setIsAdmin(false));
  }, []);

  const items = isAdmin ? [...ITEMS, ADMIN_ITEM] : ITEMS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-smix-surface/90 backdrop-blur border-t border-smix-border flex justify-around py-2 z-20">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="flex flex-col items-center gap-1 text-smix-muted hover:text-smix-accent transition text-xs px-3 py-1"
        >
          <span className="text-lg leading-none">{item.icon}</span>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
