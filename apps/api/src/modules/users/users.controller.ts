import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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
  updateProfile(@Req() req: any, @Body() body: { name?: string; photoUrl?: string }) {
    return this.usersService.updateProfile(req.user.userId, body);
  }
}
