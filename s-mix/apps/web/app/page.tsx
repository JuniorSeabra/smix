'use client';

import { useState } from 'react';
import { BandSilhouette } from '../components/BandSilhouette';
import { TabletMultitrackIcon } from '../components/TabletMultitrackIcon';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Credenciais inválidas');
      const data = await res.json();
      localStorage.setItem('smix_access_token', data.accessToken);
      window.location.href = '/home';
    } catch (err: any) {
      setError(err.message ?? 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden">
      <BandSilhouette />
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold tracking-tight bg-gradient-to-r from-smix-primary to-smix-accent bg-clip-text text-transparent">
              S-MIX
            </span>
            <TabletMultitrackIcon className="w-16 h-auto drop-shadow-[0_0_18px_rgba(56,189,248,0.35)]" />
          </div>
          <p className="text-smix-muted text-sm text-center mt-1">
            MultiTracks para músicos e equipes de louvor
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            type="email"
            placeholder="E-mail"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl2 bg-smix-surface/80 backdrop-blur border border-smix-border px-4 py-3 text-sm outline-none focus:border-smix-accent transition"
          />
          <input
            type="password"
            placeholder="Senha"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl2 bg-smix-surface/80 backdrop-blur border border-smix-border px-4 py-3 text-sm outline-none focus:border-smix-accent transition"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl2 bg-gradient-to-r from-smix-primary to-smix-accent py-3 font-medium text-sm hover:opacity-90 transition disabled:opacity-50 shadow-[0_0_24px_rgba(109,94,245,0.35)]"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="flex flex-col items-center gap-2 text-sm">
          <a href="/cadastro" className="text-smix-accent hover:underline">
            Criar Login
          </a>
          <a href="/recuperar-senha" className="text-smix-muted hover:underline">
            Esqueci minha senha
          </a>
        </div>
      </div>
    </main>
  );
}
