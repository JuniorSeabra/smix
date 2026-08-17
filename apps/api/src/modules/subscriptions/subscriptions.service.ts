import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PAYMENT_GATEWAY_ADAPTER,
  PaymentGatewayAdapter,
} from './payment-gateway.interface';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY_ADAPTER) private gateway: PaymentGatewayAdapter,
  ) {}

  async getMySubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSubscription(userId: string, userEmail: string) {
    const existing = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'PENDING'] } },
    });
    if (existing) {
      throw new ConflictException('Já existe uma assinatura ativa ou pendente para este usuário');
    }

    const amount = Number(process.env.SUBSCRIPTION_AMOUNT ?? '40.00');
    const periodicity = process.env.SUBSCRIPTION_PERIODICITY ?? 'monthly';

    const checkout = await this.gateway.createSubscriptionCheckout({
      userId,
      userEmail,
      amount,
      periodicity,
    });

    const nextBillingDate =
      checkout.status === 'ACTIVE' ? addPeriod(new Date(), periodicity) : null;

    return this.prisma.subscription.create({
      data: {
        userId,
        gateway: this.gateway.name,
        gatewayCustomerId: checkout.gatewayCustomerId,
        gatewaySubscriptionId: checkout.gatewaySubscriptionId,
        status: checkout.status,
        amount,
        periodicity,
        nextBillingDate,
      },
    });
  }
}

function addPeriod(date: Date, periodicity: string): Date {
  const next = new Date(date);
  if (periodicity === 'yearly') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}
