import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { BootstrapController } from './bootstrap.controller';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController, BootstrapController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
