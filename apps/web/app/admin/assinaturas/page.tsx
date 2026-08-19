'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { AdminNav } from '../../../components/AdminNav';

type Subscription = {
  id: string;
  status: string;
  amount: string;
  periodicity: string;
  gateway: string;
  nextBillingDate: string | null;
  createdAt: string;
  user: { name: string; email: string };
};

export default function AdminAssinaturasPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    apiFetch('/admin/subscriptions')
      .then((res) => (res.ok ? res.json() : []))
      .then(setSubscriptions);
  }, []);

  return (
    <main className="min-h-screen px-6 py-8 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Assinaturas</h1>
        <AdminNav current="/admin/assinaturas" />
      </div>

      <div className="flex flex-col gap-2">
        {subscriptions.map((sub) => (
          <div
            key={sub.id}
            className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 flex justify-between items-center text-sm"
          >
            <div>
              <p>{sub.user.name}</p>
              <p className="text-smix-muted text-xs">{sub.user.email}</p>
              <p className="text-smix-muted text-xs mt-1">
                {sub.gateway} · R$ {sub.amount} / {sub.periodicity === 'monthly' ? 'mês' : sub.periodicity}
                {sub.nextBillingDate && ` · próxima cobrança ${new Date(sub.nextBillingDate).toLocaleDateString('pt-BR')}`}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full border whitespace-nowrap ${
                sub.status === 'ACTIVE'
                  ? 'border-green-500 text-green-400'
                  : sub.status === 'PENDING'
                    ? 'border-yellow-500 text-yellow-400'
                    : 'border-smix-border text-smix-muted'
              }`}
            >
              {sub.status}
            </span>
          </div>
        ))}
        {subscriptions.length === 0 && <p className="text-smix-muted text-sm">Nenhuma assinatura ainda.</p>}
      </div>
    </main>
  );
}
