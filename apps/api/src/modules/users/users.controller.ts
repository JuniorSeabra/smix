import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PROFILE_PHOTO_MULTER_LIMITS, profilePhotoFileFilter } from '../../common/utils/profile-photo';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getProfile(@Req() req: any) {
    return this.usersService.findProfile(req.user.userId);
  }

  @Patch('me')
  updateProfile(@Req() req: any, @Body() body: { name?: string }) {
    return this.usersService.updateProfile(req.user.userId, body);
  }

  @Patch('me/photo')
  @UseInterceptors(
    FileInterceptor('photo', { limits: PROFILE_PHOTO_MULTER_LIMITS, fileFilter: profilePhotoFileFilter }),
  )
  async updatePhoto(@Req() req: any, @UploadedFile() photo?: Express.Multer.File) {
    if (!photo) throw new BadRequestException('Envie um arquivo no campo "photo"');
    return this.usersService.updatePhoto(req.user.userId, photo);
  }
}
