'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { AdminNav } from '../../../components/AdminNav';

type Payment = {
  id: string;
  amount: string;
  method: string;
  status: string;
  transactionId: string | null;
  paidAt: string | null;
  createdAt: string;
  user: { name: string; email: string };
};

export default function AdminPagamentosPage() {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    apiFetch('/admin/payments')
      .then((res) => (res.ok ? res.json() : []))
      .then(setPayments);
  }, []);

  return (
    <main className="min-h-screen px-6 py-8 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Pagamentos</h1>
        <AdminNav current="/admin/pagamentos" />
      </div>

      <div className="flex flex-col gap-2">
        {payments.map((p) => (
          <div
            key={p.id}
            className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 flex justify-between items-center text-sm"
          >
            <div>
              <p>{p.user.name}</p>
              <p className="text-smix-muted text-xs">{p.user.email}</p>
              <p className="text-smix-muted text-xs mt-1">
                {p.method}
                {p.paidAt && ` · pago em ${new Date(p.paidAt).toLocaleDateString('pt-BR')}`}
              </p>
            </div>
            <div className="text-right">
              <p>R$ {p.amount}</p>
              <span
                className={`text-xs px-2 py-1 rounded-full border whitespace-nowrap ${
                  p.status === 'APPROVED'
                    ? 'border-green-500 text-green-400'
                    : p.status === 'PENDING'
                      ? 'border-yellow-500 text-yellow-400'
                      : 'border-red-500 text-red-400'
                }`}
              >
                {p.status}
              </span>
            </div>
          </div>
        ))}
        {payments.length === 0 && <p className="text-smix-muted text-sm">Nenhum pagamento ainda.</p>}
      </div>
    </main>
  );
}
