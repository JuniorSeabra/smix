import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { BootstrapController } from './bootstrap.controller';
import { JwtStrategy } from './jwt.strategy';

// BootstrapController está reativado desde 20/08/2026, no cenário que o próprio
// aviso anterior previa: o Postgres do Render expirou junto com a cota, o banco
// foi recriado vazio no Neon e não sobrou nenhum admin — nem nenhum usuário.
// Com o cadastro público fechado (PUBLIC_SIGNUP_ENABLED=false), não existia
// caminho nenhum de entrada na plataforma.
//
// ADMIN_BOOTSTRAP_SECRET foi trocado por um valor novo ao criar o projeto na
// Vercel, como o aviso pedia. Depois de recriar os admins, o caminho normal
// volta a ser /admin/usuarios, e este controller pode sair daqui de novo.
@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController, BootstrapController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
