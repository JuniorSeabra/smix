import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

// BootstrapController saiu daqui de novo em 24/08/2026, depois de cumprir o que
// motivou a reativação em 20/08 (banco recriado vazio no Neon, sem nenhum admin).
// Os admins já existem e o caminho normal — /admin/usuarios — voltou a funcionar.
//
// Ele não pode ficar registrado no dia a dia: duas das três rotas eram GET com o
// ADMIN_BOOTSTRAP_SECRET na query string, e query string vai parar em log de
// acesso do host, histórico de navegador e header Referer. Um segredo que vaza
// por log vira ADMIN para quem o ler, sem senha nenhuma.
//
// Se um dia o cenário se repetir, reativar aqui, usar, e remover na sequência —
// trocando ADMIN_BOOTSTRAP_SECRET por um valor novo depois.
@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
