'use client';

const ITEMS = [
  { href: '/home', label: 'Início', icon: '🏠' },
  { href: '/explore', label: 'Explore', icon: '🔍' },
  { href: '/mixagem', label: 'Mixagem', icon: '🎚' },
  { href: '/afinador', label: 'Afinador', icon: '🎵' },
  { href: '/chat', label: 'Chat', icon: '💬' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-smix-surface/90 backdrop-blur border-t border-smix-border flex justify-around py-2 z-20">
      {ITEMS.map((item) => (
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
