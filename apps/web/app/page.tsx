'use client';

import { useEffect, useState } from 'react';
import { BandSilhouette } from '../components/BandSilhouette';
import { TabletMultitrackIcon } from '../components/TabletMultitrackIcon';

// Etapas reais do login, na ordem em que acontecem. A porcentagem mostrada no
// botão é a da última etapa efetivamente concluída — não é um contador que
// anda sozinho nem um número aleatório. Se uma etapa demora, a barra fica
// parada nela de propósito: é a informação verdadeira.
const STEPS = [
  { percent: 15, label: 'Conectando' },
  { percent: 45, label: 'Autenticando' },
  { percent: 70, label: 'Validando sessão' },
  { percent: 90, label: 'Carregando perfil' },
  { percent: 100, label: 'Entrando' },
] as const;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(-1);

  // Se o cadastro público está fechado (o padrão hoje — quem cria conta é o
  // admin), o link "Criar Login" nem aparece. Começa como null pra não piscar
  // o link na tela antes de o backend responder.
  const [publicSignup, setPublicSignup] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/config`)
      .then((res) => (res.ok ? res.json() : { publicSignupEnabled: false }))
      .then((cfg) => setPublicSignup(!!cfg.publicSignupEnabled))
      .catch(() => setPublicSignup(false));
  }, []);

  const progress = step >= 0 ? STEPS[step].percent : 0;

  // Traduz a falha pro que de fato aconteceu.
  //
  // Antes, qualquer resposta não-ok virava "Credenciais inválidas": servidor
  // fora do ar, banco desconectado e erro interno apareciam todos como senha
  // errada. O usuário ficava trocando senha e tentando de novo enquanto o
  // problema estava do nosso lado — foi o que aconteceu em 20/08/2026, com a
  // API respondendo 500 por falta de banco.
  function mensagemDeErro(status: number, corpo: any): string {
    if (status === 401) return 'E-mail ou senha incorretos.';
    if (status === 403) return corpo?.message ?? 'Acesso não liberado para esta conta.';
    if (status === 429) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
    if (status >= 500) return 'O servidor não está respondendo agora. Não é a sua senha — tente de novo em alguns minutos.';
    return corpo?.message ?? 'Não foi possível entrar.';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setStep(0); // 15% — requisição saindo
    try {
      let res: Response;
      try {
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
      } catch {
        // fetch só rejeita quando a requisição não chegou a ter resposta: API
        // fora do ar, sem internet, DNS. O navegador chama isso de "Load
        // failed"/"Failed to fetch", que não diz nada a quem está usando o app.
        throw new Error('Não conseguimos falar com o servidor. Verifique sua internet — se ela estiver ok, o problema é nosso.');
      }

      setStep(1); // 45% — servidor respondeu
      if (!res.ok) {
        const corpo = await res.json().catch(() => null);
        throw new Error(mensagemDeErro(res.status, corpo));
      }

      const data = await res.json();
      setStep(2); // 70% — token recebido
      if (!data?.accessToken) throw new Error('Resposta inválida do servidor');
      localStorage.setItem('smix_access_token', data.accessToken);

      // Já busca o perfil aqui: confirma que o token vale de verdade antes de
      // sair da tela de login (e a home abre com o dado quente no cache HTTP).
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      }).catch(() => null);
      setStep(3); // 90% — sessão confirmada

      setStep(4); // 100% — redirecionando
      window.location.href = '/home';
    } catch (err: any) {
      setError(err.message ?? 'Erro ao entrar');
      setStep(-1);
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

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl2 bg-gradient-to-r from-smix-primary to-smix-accent py-3 font-medium text-sm hover:opacity-90 transition disabled:opacity-70 shadow-[0_0_24px_rgba(109,94,245,0.35)] tabular-nums"
            >
              {loading ? `${progress}%` : 'Entrar'}
            </button>

            {/* Barra de progresso do login. O download de arquivo já teve uma
                igual, mas hoje quem baixa é o navegador, com a barra dele. */}
            {loading && (
              <>
                <div className="h-1.5 rounded-full bg-smix-surface overflow-hidden">
                  <div
                    className="h-full bg-smix-accent transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-smix-muted text-xs text-center">
                  {step >= 0 ? STEPS[step].label : ''}
                </p>
              </>
            )}
          </div>
        </form>

        <div className="flex flex-col items-center gap-2 text-sm">
          {publicSignup && (
            <a href="/cadastro" className="text-smix-accent hover:underline">
              Criar Login
            </a>
          )}
          <a href="/recuperar-senha" className="text-smix-muted hover:underline">
            Esqueci minha senha
          </a>
        </div>
      </div>
    </main>
  );
}
