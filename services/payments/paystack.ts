// services/payments/paystack.ts
import crypto from 'crypto';

export interface PaystackConfig {
  secretKey: string;
  publicKey: string;
  isTest?: boolean;
}

export interface PaystackTransaction {
  reference: string;
  amount: number;
  email: string;
  currency?: string;
  metadata?: Record<string, any>;
  callbackUrl?: string;
  channels?: string[]; // ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
}

export interface InitializeTransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface VerifyTransactionResponse {
  status: boolean;
  message: string;
  data: {
    amount: number;
    currency: string;
    transaction_date: string;
    status: 'success' | 'failed' | 'pending';
    reference: string;
    domain: string;
    metadata: Record<string, any>;
    authorization: {
      authorization_code: string;
      card_type: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      bin: string;
      bank: string;
      country_code: string;
    };
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
  };
}

export interface WebhookPayload {
  event: string;
  data: any;
}

export class PaystackService {
  private static config: PaystackConfig | null = null;
  private static readonly API_URL = 'https://api.paystack.co';
  private static readonly SANDBOX_URL = 'https://api.paystack.co';

  /**
   * Initialize Paystack payment service
   */
  static initialize(config: PaystackConfig): void {
    if (!config.secretKey) {
      throw new Error('Paystack secretKey is required');
    }
    if (!config.publicKey) {
      throw new Error('Paystack publicKey is required');
    }
    this.config = config;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Paystack service initialized');
    }
  }

  /**
   * Get base API URL
   */
  private static getBaseUrl(): string {
    return this.config?.isTest ? this.SANDBOX_URL : this.API_URL;
  }

  /**
   * Get request headers with authorization
   */
  private static getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.config!.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Generate HMAC-SHA512 signature for webhook verification
   */
  static verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config) {
      throw new Error('Paystack service not initialized');
    }

    const expectedSignature = crypto
      .createHmac('sha512', this.config.secretKey)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Initialize a transaction
   */
  static async initializeTransaction(
    transaction: PaystackTransaction
  ): Promise<InitializeTransactionResponse> {
    if (!this.config) {
      throw new Error('Paystack service not initialized. Call initialize() first.');
    }

    // Validate required fields
    if (!transaction.reference) {
      throw new Error('Transaction reference is required');
    }
    if (!transaction.amount || transaction.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!transaction.email) {
      throw new Error('Customer email is required');
    }

    // Convert amount to kobo (smallest currency unit)
    const amountInKobo = Math.round(transaction.amount * 100);

    const requestBody = {
      reference: transaction.reference,
      amount: amountInKobo,
      email: transaction.email,
      currency: transaction.currency || 'ZAR',
      metadata: transaction.metadata,
      callback_url: transaction.callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment-verification`,
      channels: transaction.channels || ['card', 'bank_transfer', 'ussd'],
    };

    try {
      const response = await fetch(`${this.getBaseUrl()}/transaction/initialize`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        throw new Error(data.message || 'Transaction initialization failed');
      }

      return data;
    } catch (error) {
      console.error('Paystack transaction initialization error:', error);
      throw new Error(error instanceof Error ? error.message : 'Payment initialization failed');
    }
  }

  /**
   * Verify a transaction
   */
  static async verifyTransaction(reference: string): Promise<VerifyTransactionResponse> {
    if (!this.config) {
      throw new Error('Paystack service not initialized. Call initialize() first.');
    }

    if (!reference) {
      throw new Error('Transaction reference is required');
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/transaction/verify/${reference}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        throw new Error(data.message || 'Transaction verification failed');
      }

      return data;
    } catch (error) {
      console.error('Paystack transaction verification error:', error);
      throw new Error(error instanceof Error ? error.message : 'Payment verification failed');
    }
  }

  /**
   * Handle webhook events from Paystack
   */
  static async handleWebhook(
    payload: WebhookPayload,
    signature: string
  ): Promise<{ handled: boolean; transaction?: VerifyTransactionResponse['data'] }> {
    if (!this.config) {
      throw new Error('Paystack service not initialized');
    }

    // Verify webhook signature
    const payloadString = JSON.stringify(payload);
    const isValid = this.verifyWebhookSignature(payloadString, signature);

    if (!isValid) {
      console.warn('Paystack webhook: Invalid signature');
      return { handled: false };
    }

    // Handle different event types
    switch (payload.event) {
      case 'charge.success':
        // Verify the transaction to get full details
        const verification = await this.verifyTransaction(payload.data.reference);
        if (verification.status) {
          return {
            handled: true,
            transaction: verification.data,
          };
        }
        break;
      
      case 'charge.dispute.create':
        console.log('Dispute created:', payload.data.reference);
        break;
      
      case 'charge.dispute.remind':
        console.log('Dispute reminder:', payload.data.reference);
        break;
      
      case 'charge.dispute.resolve':
        console.log('Dispute resolved:', payload.data.reference);
        break;
      
      default:
        console.log(`Unhandled Paystack event: ${payload.event}`);
    }

    return { handled: true };
  }

  /**
   * Create a charge authorization for recurring payments
   */
  static async createChargeAuthorization(params: {
    email: string;
    amount: number;
    authorization_code: string;
    reference?: string;
  }): Promise<any> {
    if (!this.config) {
      throw new Error('Paystack service not initialized');
    }

    const amountInKobo = Math.round(params.amount * 100);
    const reference = params.reference || `charge_${Date.now()}`;

    const requestBody = {
      email: params.email,
      amount: amountInKobo,
      authorization_code: params.authorization_code,
      reference,
    };

    try {
      const response = await fetch(`${this.getBaseUrl()}/transaction/charge_authorization`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        throw new Error(data.message || 'Charge authorization failed');
      }

      return data;
    } catch (error) {
      console.error('Paystack charge authorization error:', error);
      throw new Error(error instanceof Error ? error.message : 'Charge failed');
    }
  }

  /**
   * List banks for bank transfer payments
   */
  static async listBanks(country: string = 'ZA'): Promise<any[]> {
    if (!this.config) {
      throw new Error('Paystack service not initialized');
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/bank?country=${country}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        throw new Error(data.message || 'Failed to fetch banks');
      }

      return data.data;
    } catch (error) {
      console.error('Paystack list banks error:', error);
      return [];
    }
  }

  /**
   * Resolve account number for bank transfer verification
   */
  static async resolveAccountNumber(accountNumber: string, bankCode: string): Promise<any> {
    if (!this.config) {
      throw new Error('Paystack service not initialized');
    }

    try {
      const response = await fetch(
        `${this.getBaseUrl()}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.status) {
        throw new Error(data.message || 'Account resolution failed');
      }

      return data.data;
    } catch (error) {
      console.error('Paystack account resolution error:', error);
      throw new Error(error instanceof Error ? error.message : 'Account verification failed');
    }
  }

  /**
   * Refund a transaction
   */
  static async refundTransaction(
    reference: string,
    amount?: number
  ): Promise<{ status: boolean; message: string }> {
    if (!this.config) {
      throw new Error('Paystack service not initialized');
    }

    const requestBody: any = { transaction: reference };
    if (amount) {
      requestBody.amount = Math.round(amount * 100);
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/refund`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      return {
        status: data.status,
        message: data.message,
      };
    } catch (error) {
      console.error('Paystack refund error:', error);
      return {
        status: false,
        message: error instanceof Error ? error.message : 'Refund failed',
      };
    }
  }
}