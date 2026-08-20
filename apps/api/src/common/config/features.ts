// Chaves de liga/desliga da plataforma, lidas do ambiente.
//
// Ficam juntas aqui porque as duas existem pelo mesmo motivo: a plataforma
// ainda está em teste, e o que vale hoje (cadastro fechado, sem cobrança) não é
// o que vai valer quando o gateway de pagamento entrar. Mudar de ideia tem que
// ser trocar uma variável no painel do host, não mexer em código.
//
// Lidas a cada chamada, de propósito: assim trocar a variável e reiniciar o
// serviço basta, sem depender de nada ter sido capturado no boot.

function readFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  return raw.toLowerCase() === 'true' || raw === '1';
}

// Cadastro pela tela de login ("Criar Login").
// Desligado por padrão: hoje quem cria usuário é o admin, pelo painel.
export function isPublicSignupEnabled(): boolean {
  return readFlag('PUBLIC_SIGNUP_ENABLED', false);
}

// Exigir assinatura ativa pra baixar arquivo.
// Ligado por padrão — o catálogo é pago. Desligue (REQUIRE_SUBSCRIPTION=false)
// só enquanto estiver testando com contas que não passaram por cobrança; note
// que, com o cadastro público fechado, a alternativa mais segura é criar o
// usuário no painel já marcando "liberar acesso", que gera a assinatura ativa
// dele sem abrir o catálogo pra todo mundo que tiver login.
export function isSubscriptionRequired(): boolean {
  return readFlag('REQUIRE_SUBSCRIPTION', true);
}
