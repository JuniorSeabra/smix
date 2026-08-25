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

// Falha no boot, e não na primeira requisição.
//
// Sem segredo, `secretOrKey` ficaria undefined e a verificação de assinatura
// deixaria de acontecer de forma previsível — o modo de falha mais perigoso
// possível numa camada de autenticação. Melhor a aplicação não subir.
export function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET ausente ou curto demais (mínimo 32 caracteres). ' +
        'Defina-o nas variáveis de ambiente antes de iniciar a API.',
    );
  }
  return secret;
}

export function requireRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_REFRESH_SECRET ausente ou curto demais (mínimo 32 caracteres). ' +
        'Defina-o nas variáveis de ambiente antes de iniciar a API.',
    );
  }
  return secret;
}
