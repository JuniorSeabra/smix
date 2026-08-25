import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESS_TOKEN_TYPE, JwtPayload, requireJwtSecret } from './jwt.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Assinatura e expiração são verificadas aqui, antes do validate() abaixo
      // rodar: token adulterado, com assinatura inválida ou vencido nunca chega
      // ao corpo do método — passport responde 401 sozinho.
      ignoreExpiration: false,
      // Pinagem do algoritmo. Sem esta lista o verificador aceita qualquer
      // algoritmo declarado no cabeçalho do próprio token, o que abre a família
      // de ataques de confusão de algoritmo. Só HS256 é emitido por
      // AuthService.buildTokenResponse, então só HS256 deve ser aceito.
      algorithms: ['HS256'],
      secretOrKey: requireJwtSecret(),
    });
  }

  // Roda em toda requisição autenticada — não só na hora do login. Isso garante
  // que desativar um usuário (status = INACTIVE) derruba o acesso na hora,
  // mesmo que o token JWT dele ainda não tenha expirado.
  async validate(payload: JwtPayload) {
    // O refresh token é assinado com o mesmo formato de payload. Se algum dia
    // JWT_REFRESH_SECRET for igual a JWT_SECRET (copiar e colar no painel do
    // host é fácil), um refresh token de 7 dias passaria a valer como token de
    // acesso e a expiração curta de 15 minutos perderia o sentido. A checagem
    // de tipo abaixo fecha isso independente de como os segredos estejam.
    if (payload.type !== ACCESS_TOKEN_TYPE) {
      throw new UnauthorizedException('Token inválido para esta operação');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true, role: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Conta desativada ou não encontrada');
    }
    // Usa o cargo atual do banco, não o que veio congelado no token — assim
    // promover/remover admin também tem efeito imediato, sem esperar relogar.
    //
    // Este é o ponto que torna impossível virar ADMIN adulterando o token: nada
    // do que vem dentro do JWT define autorização, só o id é usado, e o cargo é
    // sempre relido da tabela User.
    return { userId: user.id, email: payload.email, role: user.role };
  }
}
