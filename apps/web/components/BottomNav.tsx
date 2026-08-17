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
    <>
      {/* Mobile / tablet: navegação inferior fixa */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-smix-surface border-t border-smix-border flex justify-around py-2">
        {ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 text-smix-muted hover:text-smix-text transition text-xs px-2 py-1"
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>

      {/* Desktop: navegação horizontal completa */}
      <nav className="hidden md:flex justify-center gap-8 border-b border-smix-border py-3">
        {ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 text-smix-muted hover:text-smix-text transition text-sm"
          >
            <span>{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>
    </>
  );
}
