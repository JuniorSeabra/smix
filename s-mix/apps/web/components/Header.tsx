'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { TabletMultitrackIcon } from './TabletMultitrackIcon';

export function Header() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/users/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPhotoUrl(data?.photoUrl ?? null))
      .catch(() => {});
  }, []);

  return (
    <header className="w-full grid grid-cols-3 items-center px-5 py-4 sticky top-0 bg-smix-bg/70 backdrop-blur-md z-10 border-b border-smix-border/50">
      <div />
      <a href="/home" className="justify-self-center flex items-center gap-2">
        <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-smix-primary to-smix-accent bg-clip-text text-transparent">
          S-MIX
        </span>
        <TabletMultitrackIcon className="w-8 h-auto" />
      </a>
      <a href="/perfil" className="justify-self-end flex flex-col items-center gap-1">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-smix-primary to-smix-accent overflow-hidden">
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Perfil" className="w-full h-full object-cover" />
          )}
        </div>
        <span className="text-[10px] text-smix-muted">⚙</span>
      </a>
    </header>
  );
}
