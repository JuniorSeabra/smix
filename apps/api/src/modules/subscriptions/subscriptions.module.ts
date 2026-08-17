import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { ManualGatewayAdapter } from './adapters/manual-gateway.adapter';
import { PAYMENT_GATEWAY_ADAPTER } from './payment-gateway.interface';

// Seleciona o adapter de gateway pela env PAYMENT_GATEWAY. Hoje só existe o
// ManualGatewayAdapter (dev, sem cobrança real); quando um gateway for contratado,
// basta criar o adapter (ex. AsaasGatewayAdapter) e adicionar o case aqui.
const paymentGatewayProvider = {
  provide: PAYMENT_GATEWAY_ADAPTER,
  useFactory: () => {
    switch (process.env.PAYMENT_GATEWAY) {
      // case 'asaas': return new AsaasGatewayAdapter();
      // case 'pagarme': return new PagarmeGatewayAdapter();
      // case 'mercadopago': return new MercadoPagoGatewayAdapter();
      // case 'stripe': return new StripeGatewayAdapter();
      default:
        return new ManualGatewayAdapter();
    }
  },
};

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, paymentGatewayProvider],
  exports: [paymentGatewayProvider],
})
export class SubscriptionsModule {}
