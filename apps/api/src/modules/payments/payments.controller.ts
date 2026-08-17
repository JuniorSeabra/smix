import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  listMine(@Req() req: any) {
    return this.paymentsService.listForUser(req.user.userId);
  }

  // Rota pública (o gateway de pagamento não tem o JWT do usuário) — a segurança
  // vem da verificação de assinatura HMAC feita dentro do adapter, não de um guard.
  @Post('webhook')
  webhook(@Body() body: unknown, @Headers('x-webhook-signature') signature?: string) {
    return this.paymentsService.handleWebhook(JSON.stringify(body), signature, body);
  }
}
