// services/payments/peachPayments.ts
export interface PeachPaymentsConfig {
  entityId: string;
  bearerToken: string;
}

export class PeachPaymentsService {
  private static config: PeachPaymentsConfig | null = null;

  static initialize(config: PeachPaymentsConfig) {
    this.config = config;
  }

  static async createCheckout(data: {
    amount: number;
    currency: string;
    merchantTransactionId: string;
  }): Promise<{ id: string; redirectUrl: string }> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      id: `checkout_${Date.now()}`,
      redirectUrl: `https://peachpayments.com/checkout/${Date.now()}`,
    };
  }

  static async getPaymentStatus(
    checkoutId: string
  ): Promise<'success' | 'pending' | 'failed'> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return 'success';
  }
}
