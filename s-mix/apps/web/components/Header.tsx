'use client';

export function Header() {
  return (
    <header className="w-full flex items-center justify-between px-5 py-4">
      <a href="/home" className="text-xl font-bold tracking-tight bg-gradient-to-r from-smix-primary to-smix-accent bg-clip-text text-transparent">
        S-MIX
      </a>

      <a href="/perfil" className="flex flex-col items-center gap-1">
        <div className="w-9 h-9 rounded-full bg-smix-surface border border-smix-border overflow-hidden" />
        <span className="text-[10px] text-smix-muted">⚙</span>
      </a>
    </header>
  );
}
