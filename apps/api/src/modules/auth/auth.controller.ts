import { Body, Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
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

  @Post('register')
  @UseInterceptors(
    FileInterceptor('photo', { limits: PROFILE_PHOTO_MULTER_LIMITS, fileFilter: profilePhotoFileFilter }),
  )
  register(@Body() dto: RegisterDto, @UploadedFile() photo?: Express.Multer.File) {
    return this.authService.register(dto, photo);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
