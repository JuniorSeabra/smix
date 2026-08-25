import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { processProfilePhoto } from '../../common/utils/profile-photo';
import { isPublicSignupEnabled } from '../../common/config/features';
import {
  ACCESS_TOKEN_TYPE,
  REFRESH_TOKEN_TYPE,
  requireJwtSecret,
  requireRefreshSecret,
} from './jwt.constants';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto, photo?: Express.Multer.File) {
    // Fechado por padrão: quem cria conta é o admin, pelo painel. A checagem é
    // aqui e não só no frontend — esconder o botão "Criar Login" não impede
    // ninguém de chamar POST /auth/register direto.
    if (!isPublicSignupEnabled()) {
      throw new ForbiddenException('O cadastro é feito pelo administrador. Fale com a equipe do S-MIX.');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const photoUrl = photo ? await processProfilePhoto(photo.buffer, photo.mimetype) : undefined;

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        photoUrl,
      },
    });

    return this.buildTokenResponse(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.buildTokenResponse(user.id, user.email);
  }

  // O cargo NÃO entra mais no payload.
  //
  // Antes o token carregava `role`, e um campo desses convida quem for mexer no
  // código a lê-lo para decidir permissão — o que seria confiar num dado que
  // viaja pelo cliente. Hoje o cargo é sempre relido do banco em
  // JwtStrategy.validate, então guardá-lo no token só cria risco sem uso.
  //
  // `type` separa token de acesso de token de renovação: os dois têm o mesmo
  // formato e, se os segredos coincidirem, um passaria pelo outro.
  private buildTokenResponse(userId: string, email: string) {
    const base = { sub: userId, email };
    return {
      accessToken: this.jwtService.sign(
        { ...base, type: ACCESS_TOKEN_TYPE },
        {
          secret: requireJwtSecret(),
          algorithm: 'HS256',
          expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
        },
      ),
      refreshToken: this.jwtService.sign(
        { ...base, type: REFRESH_TOKEN_TYPE },
        {
          secret: requireRefreshSecret(),
          algorithm: 'HS256',
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
        },
      ),
    };
  }
}
