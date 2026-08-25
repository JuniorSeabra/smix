// Tipos de token emitidos. Vão dentro do payload como `type` e são conferidos
// por JwtStrategy.validate — ver a explicação lá sobre por que um refresh token
// não pode ser aceito como token de acesso.
export const ACCESS_TOKEN_TYPE = 'access';
export const REFRESH_TOKEN_TYPE = 'refresh';

export type TokenType = typeof ACCESS_TOKEN_TYPE | typeof REFRESH_TOKEN_TYPE;

export interface JwtPayload {
  sub: string;
  email: string;
  type: TokenType;
}

// Duas exigências com pesos diferentes, de propósito.
//
// SEGREDO AUSENTE derruba a aplicação: sem ele `secretOrKey` fica undefined e a
// verificação de assinatura para de acontecer de forma previsível — o pior modo
// de falha possível numa camada de autenticação. Melhor não subir.
//
// SEGREDO CURTO apenas avisa, e não impede o boot. A checagem de tamanho é uma
// boa prática, não um requisito de funcionamento: um segredo de 27 caracteres
// assina e verifica token normalmente, só resiste menos a força bruta offline.
// Derrubar a API por causa disso transformaria um endurecimento em queda de
// serviço no deploy — trocar o valor no painel do host é uma tarefa de minutos
// que não precisa bloquear a subida de correções críticas.
const TAMANHO_RECOMENDADO = 32;

function lerSegredo(nome: string): string {
  const secret = process.env[nome];
  if (!secret) {
    throw new Error(
      `${nome} ausente. Defina-o nas variáveis de ambiente antes de iniciar a API.`,
    );
  }
  if (secret.length < TAMANHO_RECOMENDADO) {
    // console.warn e não Logger: isto roda antes do Nest existir.
    console.warn(
      `[seguranca] ${nome} tem ${secret.length} caracteres; o recomendado é ao ` +
        `menos ${TAMANHO_RECOMENDADO}. A API sobe assim mesmo, mas troque o valor ` +
        `no painel do host — segredo curto é mais fácil de quebrar offline.`,
    );
  }
  return secret;
}

export function requireJwtSecret(): string {
  return lerSegredo('JWT_SECRET');
}

export function requireRefreshSecret(): string {
  return lerSegredo('JWT_REFRESH_SECRET');
}
