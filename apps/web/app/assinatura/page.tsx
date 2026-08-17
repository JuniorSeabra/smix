'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

type Subscription = { status: string; nextBillingDate: string | null } | null;

export default function AssinaturaPage() {
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/subscriptions/me')
      .then((res) => (res.ok ? res.json() : null))
      .then(setSubscription)
      .finally(() => setChecking(false));
  }, []);

  async function handleSubscribe() {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch('/subscriptions', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Não foi possível ativar a assinatura');
      }
      window.location.href = '/home';
    } catch (err: any) {
      setError(err.message ?? 'Erro ao assinar');
    } finally {
      setLoading(false);
    }
  }

  const isActive = subscription?.status === 'ACTIVE';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Assinatura S-MIX</h1>
        <p className="text-smix-muted text-sm">
          Acesso completo à biblioteca de MultiTracks gospel.
        </p>

        <div className="w-full rounded-xl2 bg-smix-surface border border-smix-border px-6 py-6 flex flex-col items-center gap-1">
          <span className="text-3xl font-bold">R$ 40</span>
          <span className="text-smix-muted text-sm">por mês</span>
        </div>

        {checking ? (
          <p className="text-smix-muted text-sm">Verificando assinatura...</p>
        ) : isActive ? (
          <>
            <p className="text-sm">Sua assinatura já está ativa.</p>
            <a
              href="/home"
              className="w-full rounded-xl2 bg-smix-primary py-3 font-medium text-sm hover:opacity-90 transition text-center"
            >
              Ir para o início
            </a>
          </>
        ) : (
          <>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full rounded-xl2 bg-smix-primary py-3 font-medium text-sm hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Ativando...' : 'Assinar agora'}
            </button>
          </>
        )}

        <a href="/home" className="text-smix-muted text-sm hover:underline">
          Continuar sem assinar
        </a>
      </div>
    </main>
  );
}
