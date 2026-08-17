import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PAYMENT_GATEWAY_ADAPTER,
  PaymentGatewayAdapter,
} from '../subscriptions/payment-gateway.interface';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY_ADAPTER) private gateway: PaymentGatewayAdapter,
  ) {}

  async listForUser(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Endpoint chamado pelo gateway de pagamento para notificar mudanças de status.
  // NOTA: a verificação de assinatura HMAC de gateways reais (Asaas/Pagar.me/Stripe...)
  // normalmente exige o corpo bruto (raw body) da requisição, não o JSON já parseado.
  // Ao implementar um adapter real, configurar um middleware de raw body nesta rota.
  async handleWebhook(rawBody: string, signature: string | undefined, payload: unknown) {
    const isValid = this.gateway.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.warn(`Webhook rejeitado: assinatura inválida (gateway=${this.gateway.name})`);
      throw new UnauthorizedException('Assinatura do webhook inválida');
    }

    const event = this.gateway.parseWebhookEvent(payload);

    const subscription = await this.prisma.subscription.findFirst({
      where: { gatewaySubscriptionId: event.gatewaySubscriptionId },
    });
    if (!subscription) {
      this.logger.warn(`Webhook para assinatura desconhecida: ${event.gatewaySubscriptionId}`);
      return { received: true };
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: event.subscriptionStatus },
    });

    if (event.transactionId) {
      await this.prisma.payment.create({
        data: {
          userId: subscription.userId,
          subscriptionId: subscription.id,
          transactionId: event.transactionId,
          amount: event.amount ?? subscription.amount,
          method: event.method ?? 'PIX',
          status: event.subscriptionStatus === 'ACTIVE' ? 'APPROVED' : 'REFUSED',
          paidAt: event.paidAt,
        },
      });
    }

    return { received: true };
  }
}
