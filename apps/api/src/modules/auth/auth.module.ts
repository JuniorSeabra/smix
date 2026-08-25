import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

// Não existe mais controller de bootstrap.
//
// Ele foi removido do código em 24/08/2026, não apenas desregistrado: concedia
// ADMIN por HTTP, protegido só por um segredo compartilhado, e duas das três
// rotas recebiam esse segredo por query string — que vaza em log de acesso,
// histórico de navegador e cabeçalho Referer.
//
// O caminho de recuperação agora é `npm run create-admin` (ver
// scripts/create-admin.ts), que roda no shell e não expõe rota nenhuma.
// A variável ADMIN_BOOTSTRAP_SECRET não é mais lida por lugar algum e deve ser
// apagada do painel do host.
@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
