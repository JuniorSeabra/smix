import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

// BootstrapController (rota /bootstrap/make-admin) foi desativado de propósito:
// já cumpriu a função de criar o primeiro admin. A partir de agora, promover/
// remover admin é feito pelo próprio painel admin (/admin/usuarios), que já
// exige estar logado como admin — sem isso não tem como ninguém se auto-promover.
// Ver git history se precisar reativar temporariamente (ex: perdeu acesso ao
// único admin) — nesse caso, troque ADMIN_BOOTSTRAP_SECRET antes de reativar.
@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
