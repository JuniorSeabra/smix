import { Body, Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PROFILE_PHOTO_MULTER_LIMITS, profilePhotoFileFilter } from '../../common/utils/profile-photo';
import { isPublicSignupEnabled } from '../../common/config/features';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Aberto (sem login): a tela inicial precisa saber, antes de qualquer
  // autenticação, se ainda mostra o link "Criar Login".
  @Get('config')
  getConfig() {
    return { publicSignupEnabled: isPublicSignupEnabled() };
  }

  // Limite bem mais apertado que o global (100/min): aqui cada tentativa é um
  // palpite de senha. 5 por minuto por IP mantém o uso legítimo confortável e
  // torna força bruta inviável — 100/min deixaria 144 mil tentativas por dia.
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('register')
  @UseInterceptors(
    FileInterceptor('photo', { limits: PROFILE_PHOTO_MULTER_LIMITS, fileFilter: profilePhotoFileFilter }),
  )
  register(@Body() dto: RegisterDto, @UploadedFile() photo?: Express.Multer.File) {
    return this.authService.register(dto, photo);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
