'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { AdminNav } from '../../components/AdminNav';
import { AdminBottomNav } from '../../components/AdminBottomNav';
import { ChartCard, HorizontalBars } from '../../components/Charts';

type Dashboard = {
  totalUsers: number;
  activeSubscriptions: number;
  totalArtists: number;
  totalSongs: number;
  totalDownloads: number;
  pendingMessages: number;
};

// Sem cartão de assinatura nem bloco de pagamentos: a plataforma não cobra de
// ninguém. O que existia ali eram as liberações manuais do cadastro, e mostrar
// isso como "assinaturas" e "pagamentos" passava a impressão de haver cobrança.
const CARDS: { key: keyof Dashboard; label: string }[] = [
  { key: 'totalUsers', label: 'Usuários' },
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
    <main className="min-h-screen px-5 md:px-6 py-8 max-w-4xl mx-auto pb-28">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Painel Admin — S-MIX</h1>
        <AdminNav current="/admin" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {CARDS.map((card) => (
          <div key={card.key} className="rounded-xl2 bg-smix-surface border border-smix-border px-5 py-4">
            <p className="text-smix-muted text-xs mb-1">{card.label}</p>
            <p className="text-2xl font-bold">{String(data[card.key])}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
      <ChartCard title="Indicadores" subtitle="Comparativo dos números atuais do sistema">
        <HorizontalBars data={CARDS.map((card) => ({ label: card.label, value: Number(data[card.key]) }))} />
      </ChartCard>
      </div>

      <AdminBottomNav current="/admin" />
    </main>
  );
}
