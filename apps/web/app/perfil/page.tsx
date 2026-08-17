'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';

type Profile = {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  subscriptions: { status: string; nextBillingDate: string | null }[];
};

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    apiFetch('/users/me')
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setName(data.name);
      })
      .catch(() => setProfile(null));
  }, []);

  async function handleSave() {
    const res = await apiFetch('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setProfile((prev) => (prev ? { ...prev, name } : prev));
      setEditing(false);
    }
  }

  if (!profile) {
    return (
      <main className="min-h-screen">
        <Header />
        <p className="px-5 text-smix-muted">Carregando...</p>
      </main>
    );
  }

  const subscription = profile.subscriptions?.[0];

  return (
    <main className="min-h-screen pb-24 md:pb-8">
      <Header />
      <BottomNav />

      <div className="px-5 mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <button
          onClick={() => setEditing((v) => !v)}
          className="text-smix-text text-lg"
          aria-label="Editar"
        >
          ✎
        </button>
      </div>

      <div className="px-5 mt-6 flex flex-col gap-4 max-w-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-smix-surface border border-smix-border overflow-hidden">
            {profile.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
            )}
          </div>
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-xl2 bg-smix-surface border border-smix-border px-3 py-2 text-sm outline-none focus:border-smix-primary"
            />
          ) : (
            <span className="font-medium">{profile.name}</span>
          )}
        </div>

        <div className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 text-sm">
          <p className="text-smix-muted">E-mail</p>
          <p>{profile.email}</p>
        </div>

        <div className="rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 text-sm">
          <p className="text-smix-muted">Assinatura</p>
          <p>{subscription ? subscription.status : 'Sem assinatura ativa'}</p>
          {subscription?.nextBillingDate && (
            <p className="text-smix-muted text-xs mt-1">
              Próxima cobrança: {new Date(subscription.nextBillingDate).toLocaleDateString('pt-BR')}
            </p>
          )}
          {subscription?.status !== 'ACTIVE' && (
            <a href="/assinatura" className="text-smix-accent text-xs mt-2 inline-block hover:underline">
              Assinar agora
            </a>
          )}
        </div>

        {editing && (
          <button
            onClick={handleSave}
            className="rounded-xl2 bg-smix-primary py-3 font-medium text-sm hover:opacity-90 transition"
          >
            Salvar
          </button>
        )}
      </div>
    </main>
  );
}
