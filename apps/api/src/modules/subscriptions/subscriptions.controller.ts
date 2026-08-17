import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get('me')
  getMine(@Req() req: any) {
    return this.subscriptionsService.getMySubscription(req.user.userId);
  }

  @Post()
  create(@Req() req: any) {
    return this.subscriptionsService.createSubscription(req.user.userId, req.user.email);
  }
}
