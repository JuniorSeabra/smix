import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  GatewayCheckoutResult,
  GatewayWebhookEvent,
  PaymentGatewayAdapter,
} from '../payment-gateway.interface';

// Adapter provisório enquanto nenhum gateway real (Asaas/Pagar.me/Mercado Pago/Stripe)
// está contratado/configurado. Ativa a assinatura imediatamente, sem cobrança real,
// para permitir testar o fluxo completo (cadastro → assinatura → download) em dev.
// NUNCA usar em produção — trocar por um adapter real antes do lançamento (ver
// docs/arquitetura.md, seção "Pagamento").
@Injectable()
export class ManualGatewayAdapter implements PaymentGatewayAdapter {
  readonly name = 'manual';
  private readonly logger = new Logger(ManualGatewayAdapter.name);

  constructor() {
    this.logger.warn(
      'PaymentGatewayAdapter=manual em uso — nenhuma cobrança real está sendo feita. ' +
        'Configure PAYMENT_GATEWAY com um gateway real antes de ir para produção.',
    );
  }

  async createSubscriptionCheckout(input: {
    userId: string;
    userEmail: string;
    amount: number;
    periodicity: string;
  }): Promise<GatewayCheckoutResult> {
    return {
      gatewayCustomerId: `manual-customer-${input.userId}`,
      gatewaySubscriptionId: `manual-sub-${randomUUID()}`,
      status: 'ACTIVE',
    };
  }

  verifyWebhookSignature(): boolean {
    // Este adapter não recebe webhooks externos — assinatura já é ativada no checkout.
    return false;
  }

  parseWebhookEvent(): GatewayWebhookEvent {
    throw new Error('ManualGatewayAdapter não processa webhooks');
  }
}
