export interface GatewayCheckoutResult {
  gatewayCustomerId: string;
  gatewaySubscriptionId: string;
  status: 'PENDING' | 'ACTIVE';
  checkoutUrl?: string;
}

export interface GatewayWebhookEvent {
  gatewaySubscriptionId: string;
  subscriptionStatus: 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';
  transactionId?: string;
  amount?: number;
  paidAt?: Date;
  method?: 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX';
}

// Abstração para não acoplar o sistema a um gateway específico (Asaas, Pagar.me,
// Mercado Pago, Stripe...). Cada gateway real ganha seu próprio adapter implementando
// esta interface; o resto do sistema (SubscriptionsService, webhook) não muda.
export interface PaymentGatewayAdapter {
  readonly name: string;

  createSubscriptionCheckout(input: {
    userId: string;
    userEmail: string;
    amount: number;
    periodicity: string;
  }): Promise<GatewayCheckoutResult>;

  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean;

  parseWebhookEvent(payload: unknown): GatewayWebhookEvent;
}

export const PAYMENT_GATEWAY_ADAPTER = Symbol('PAYMENT_GATEWAY_ADAPTER');
