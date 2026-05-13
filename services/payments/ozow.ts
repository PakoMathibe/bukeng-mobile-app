// services/payments/ozow.ts
export interface OzowConfig {
  siteCode: string;
  privateKey: string;
}

export class OzowService {
  private static config: OzowConfig | null = null;

  static initialize(config: OzowConfig) {
    this.config = config;
  }

  static async initiatePayment(data: {
    amount: number;
    reference: string;
    customerEmail: string;
  }): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return `https://ozow.com/pay/${data.reference}`;
  }

  static async verifyPayment(
    siteCode: string,
    reference: string
  ): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
  }
}
