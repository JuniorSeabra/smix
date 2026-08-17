'use client';

import { useState } from 'react';

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } finally {
      // Sempre mostra a mesma mensagem de sucesso, exista ou não o e-mail,
      // para não revelar quais e-mails estão cadastrados na plataforma.
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <h1 className="text-2xl font-bold tracking-tight">Recuperar senha</h1>

        {sent ? (
          <p className="text-smix-muted text-sm text-center">
            Se esse e-mail estiver cadastrado, você vai receber um link para redefinir sua senha em instantes.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <input
              type="email"
              placeholder="Seu e-mail cadastrado"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 text-sm outline-none focus:border-smix-primary transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl2 bg-smix-primary py-3 font-medium text-sm hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>
        )}

        <a href="/" className="text-smix-muted text-sm hover:underline">
          Voltar para o login
        </a>
      </div>
    </main>
  );
}
