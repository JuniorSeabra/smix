'use client';

import { useRef, useState } from 'react';

export default function CadastroPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas não conferem');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      // A foto seria enviada primeiro a um endpoint de upload (S3/Drive/etc.)
      // e a URL retornada usada aqui. Por ora, o cadastro segue sem foto
      // se nenhum endpoint de upload estiver configurado ainda.
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Não foi possível criar a conta');
      }
      const data = await res.json();
      localStorage.setItem('smix_access_token', data.accessToken);
      window.location.href = '/assinatura';
    } catch (err: any) {
      setError(err.message ?? 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>

        {/* Foto de perfil */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-24 h-24 rounded-full bg-smix-surface border border-smix-border overflow-hidden flex items-center justify-center">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Foto de perfil" className="w-full h-full object-cover" />
            ) : (
              <span className="text-smix-muted text-xs text-center px-2">Sem foto</span>
            )}
          </div>
          <div className="flex gap-3 text-sm">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="text-smix-accent hover:underline"
            >
              Tirar foto
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-smix-accent hover:underline"
            >
              Enviar do dispositivo
            </button>
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handlePhotoSelected}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelected}
          />
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            type="text"
            placeholder="Nome completo"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 text-sm outline-none focus:border-smix-primary transition"
          />
          <input
            type="email"
            placeholder="E-mail"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 text-sm outline-none focus:border-smix-primary transition"
          />
          <input
            type="password"
            placeholder="Senha"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 text-sm outline-none focus:border-smix-primary transition"
          />
          <input
            type="password"
            placeholder="Confirmar senha"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl2 bg-smix-surface border border-smix-border px-4 py-3 text-sm outline-none focus:border-smix-primary transition"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl2 bg-smix-primary py-3 font-medium text-sm hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Criando conta...' : 'Continuar para assinatura'}
          </button>
        </form>

        <a href="/" className="text-smix-muted text-sm hover:underline">
          Já tenho conta
        </a>
      </div>
    </main>
  );
}
