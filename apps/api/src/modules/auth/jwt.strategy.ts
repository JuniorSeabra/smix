import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  // Roda em toda requisição autenticada — não só na hora do login. Isso garante
  // que desativar um usuário (status = INACTIVE) derruba o acesso na hora,
  // mesmo que o token JWT dele ainda não tenha expirado.
  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true, role: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Conta desativada ou não encontrada');
    }
    // Usa o cargo atual do banco, não o que veio congelado no token — assim
    // promover/remover admin também tem efeito imediato, sem esperar relogar.
    return { userId: user.id, email: payload.email, role: user.role };
  }
}
