'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

type Dashboard = {
  totalUsers: number;
  activeSubscriptions: number;
  totalArtists: number;
  totalSongs: number;
  totalDownloads: number;
  pendingMessages: number;
  recentPayments: { id: string; amount: string; status: string; user: { name: string; email: string } }[];
};

const CARDS: { key: keyof Dashboard; label: string }[] = [
  { key: 'totalUsers', label: 'Usuários' },
  { key: 'activeSubscriptions', label: 'Assinaturas ativas' },
  { key: 'totalArtists', label: 'Artistas' },
  { key: 'totalSongs', label: 'Músicas' },
  { key: 'totalDownloads', label: 'Downloads' },
  { key: 'pendingMessages', label: 'Conversas abertas' },
];

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/admin/dashboard')
      .then(async (res) => {
        if (res.status === 403) throw new Error('Acesso restrito a administradores.');
        if (!res.ok) throw new Error('Erro ao carregar dashboard.');
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-red-400 text-sm">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen px-6 py-10">
        <p className="text-smix-muted">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Painel Admin — S-MIX</h1>
        <nav className="flex gap-4 text-sm text-smix-muted">
          <a href="/admin" className="text-smix-text">Dashboard</a>
          <a href="/admin/artistas" className="hover:text-smix-text transition">Artistas</a>
          <a href="/admin/usuarios" className="hover:text-smix-text transition">Usuários</a>
          <a href="/home" className="hover:text-smix-text transition">Voltar ao app</a>
        </nav>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {CARDS.map((card) => (
          <div key={card.key} className="rounded-xl2 bg-smix-surface border border-smix-border px-5 py-4">
            <p className="text-smix-muted text-xs mb-1">{card.label}</p>
            <p className="text-2xl font-bold">{String(data[card.key])}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="text-sm text-smix-muted mb-3">Pagamentos recentes</h2>
        <div className="flex flex-col gap-2">
          {data.recentPayments.length === 0 && (
            <p className="text-smix-muted text-sm">Nenhum pagamento registrado ainda.</p>
          )}
          {data.recentPayments.map((p) => (
            <div
              key={p.id}
              className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 flex justify-between items-center text-sm"
            >
              <div>
                <p>{p.user.name}</p>
                <p className="text-smix-muted text-xs">{p.user.email}</p>
              </div>
              <div className="text-right">
                <p>R$ {p.amount}</p>
                <p className="text-smix-muted text-xs">{p.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
