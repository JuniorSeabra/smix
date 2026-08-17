'use client';

export function Header() {
  return (
    <header className="w-full flex items-center justify-between px-5 py-4 sticky top-0 bg-smix-bg/70 backdrop-blur-md z-10 border-b border-smix-border/50">
      <a href="/home" className="text-xl font-bold tracking-tight bg-gradient-to-r from-smix-primary to-smix-accent bg-clip-text text-transparent">
        S-MIX
      </a>

      <a href="/perfil" className="flex flex-col items-center gap-1">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-smix-primary to-smix-accent" />
        <span className="text-[10px] text-smix-muted">⚙</span>
      </a>
    </header>
  );
}
