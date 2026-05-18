// services/payments/peachPayments.ts

export interface PeachPaymentsConfig {
  entityId: string;
  bearerToken: string;
  isTest?: boolean;
}

export interface CheckoutOptions {
  amount: number;
  currency: string;
  merchantTransactionId: string;
  customer?: {
    givenName?: string;
    surname?: string;
    email?: string;
    phone?: string;
  };
  billing?: {
    street1?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  shipping?: {
    street1?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  returnUrl?: string;
  cancelUrl?: string;
  notificationUrl?: string;
  language?: string;
}

export interface CheckoutResponse {
  id: string;
  redirectUrl: string;
  result: {
    code: string;
    description: string;
  };
}

export interface PaymentStatusResponse {
  id: string;
  paymentType: string;
  paymentBrand: string;
  amount: string;
  currency: string;
  descriptor: string;
  result: {
    code: string;
    description: string;
  };
  resultDetails: {
    ExtendedDescription?: string;
    ConnectorTxID1?: string;
    CardNumber?: string;
  };
  timestamp: string;
  buildNumber: string;
}

export interface WebhookPayload {
  id: string;
  timestamp: string;
  result: {
    code: string;
    description: string;
  };
  amount: string;
  currency: string;
  merchantTransactionId: string;
}

export class PeachPaymentsService {
  private static config: PeachPaymentsConfig | null = null;
  private static readonly API_URL = 'https://api.peachpayments.com';
  private static readonly SANDBOX_URL = 'https://test.oppwa.com';

  /**
   * Initialize Peach Payments service
   */
  static initialize(config: PeachPaymentsConfig): void {
    if (!config.entityId) {
      throw new Error('Peach Payments entityId is required');
    }
    if (!config.bearerToken) {
      throw new Error('Peach Payments bearerToken is required');
    }
    this.config = config;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Peach Payments service initialized for entity: ${config.entityId}`);
    }
  }

  /**
   * Get base API URL based on environment
   */
  private static getBaseUrl(): string {
    return this.config?.isTest ? this.SANDBOX_URL : this.API_URL;
  }

  /**
   * Get request headers with authentication
   */
  private static getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.config!.bearerToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  /**
   * Create a checkout session
   */
  static async createCheckout(options: CheckoutOptions): Promise<CheckoutResponse> {
    if (!this.config) {
      throw new Error('Peach Payments service not initialized. Call initialize() first.');
    }

    // Validate required fields
    if (!options.amount || options.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    if (!options.currency) {
      throw new Error('Currency is required');
    }
    if (!options.merchantTransactionId) {
      throw new Error('Merchant transaction ID is required');
    }

    const formattedAmount = options.amount.toFixed(2);
    
    // Build form data
    const formData = new URLSearchParams();
    formData.append('entityId', this.config.entityId);
    formData.append('amount', formattedAmount);
    formData.append('currency', options.currency);
    formData.append('merchantTransactionId', options.merchantTransactionId);
    formData.append('paymentType', 'DB'); // Debit
    formData.append('testMode', this.config.isTest ? 'EXTERNAL' : 'INTERNAL');

    // Add customer details if provided
    if (options.customer) {
      if (options.customer.givenName) formData.append('customer.givenName', options.customer.givenName);
      if (options.customer.surname) formData.append('customer.surname', options.customer.surname);
      if (options.customer.email) formData.append('customer.email', options.customer.email);
      if (options.customer.phone) formData.append('customer.phone', options.customer.phone);
    }

    // Add billing address if provided
    if (options.billing) {
      if (options.billing.street1) formData.append('billing.street1', options.billing.street1);
      if (options.billing.city) formData.append('billing.city', options.billing.city);
      if (options.billing.state) formData.append('billing.state', options.billing.state);
      if (options.billing.country) formData.append('billing.country', options.billing.country);
      if (options.billing.postalCode) formData.append('billing.postCode', options.billing.postalCode);
    }

    // Add shipping address if provided
    if (options.shipping) {
      if (options.shipping.street1) formData.append('shipping.street1', options.shipping.street1);
      if (options.shipping.city) formData.append('shipping.city', options.shipping.city);
      if (options.shipping.state) formData.append('shipping.state', options.shipping.state);
      if (options.shipping.country) formData.append('shipping.country', options.shipping.country);
      if (options.shipping.postalCode) formData.append('shipping.postCode', options.shipping.postalCode);
    }

    // Add URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    formData.append('shopperResultUrl', options.returnUrl || `${baseUrl}/payment-result`);
    formData.append('notificationUrl', options.notificationUrl || `${baseUrl}/api/payments/peach-webhook`);

    // Add language
    if (options.language) {
      formData.append('language', options.language);
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/v1/checkouts`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.result?.description || 'Checkout creation failed');
      }

      // Build redirect URL for hosted payment page
      const redirectUrl = `${this.getBaseUrl()}/v1/paymentWidgets.js?entityId=${this.config.entityId}`;

      return {
        id: data.id,
        redirectUrl,
        result: data.result,
      };
    } catch (error) {
      console.error('Peach Payments checkout error:', error);
      throw new Error(error instanceof Error ? error.message : 'Checkout creation failed');
    }
  }

  /**
   * Get payment status
   */
  static async getPaymentStatus(checkoutId: string): Promise<PaymentStatusResponse> {
    if (!this.config) {
      throw new Error('Peach Payments service not initialized. Call initialize() first.');
    }

    if (!checkoutId) {
      throw new Error('Checkout ID is required');
    }

    const url = `${this.getBaseUrl()}/v1/checkouts/${checkoutId}/payment`;
    const params = new URLSearchParams({
      entityId: this.config.entityId,
    });

    try {
      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.bearerToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.result?.description || 'Status check failed');
      }

      return data;
    } catch (error) {
      console.error('Peach Payments status check error:', error);
      throw new Error(error instanceof Error ? error.message : 'Status check failed');
    }
  }

  /**
   * Handle webhook notification from Peach Payments
   */
  static async handleWebhook(payload: WebhookPayload): Promise<{
    verified: boolean;
    transactionId?: string;
    status?: 'success' | 'pending' | 'failed';
    merchantTransactionId?: string;
  }> {
    if (!this.config) {
      throw new Error('Peach Payments service not initialized');
    }

    // Verify the webhook (Peach Payments uses IP whitelisting or signature)
    // For production, validate the incoming IP or a shared secret
    
    const statusMap: Record<string, 'success' | 'pending' | 'failed'> = {
      '000.000.000': 'success', // Successful
      '000.000.100': 'pending',  // Pending
      '000.100.100': 'failed',   // Insufficient funds
      '000.100.110': 'failed',   // Invalid card
      '000.200.100': 'failed',   // Authentication failed
      '000.400.000': 'failed',   // Communication error
    };

    const status = statusMap[payload.result.code] || 'failed';

    return {
      verified: true,
      transactionId: payload.id,
      status,
      merchantTransactionId: payload.merchantTransactionId,
    };
  }

  /**
   * Register webhook URL with Peach Payments
   */
  static async registerWebhook(url: string): Promise<{ success: boolean; message: string }> {
    if (!this.config) {
      throw new Error('Peach Payments service not initialized');
    }

    // Note: Webhooks are typically configured in the Peach Payments dashboard,
    // but this method can call their API if available
    try {
      const formData = new URLSearchParams();
      formData.append('entityId', this.config.entityId);
      formData.append('url', url);
      formData.append('event', 'payment');

      const response = await fetch(`${this.getBaseUrl()}/v1/webhooks`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: formData,
      });

      const data = await response.json();

      return {
        success: response.ok,
        message: data.result?.description || 'Webhook registration completed',
      };
    } catch (error) {
      console.error('Webhook registration error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Refund a payment
   */
  static async refundPayment(
    paymentId: string,
    amount?: number
  ): Promise<{ success: boolean; refundId?: string; message?: string }> {
    if (!this.config) {
      throw new Error('Peach Payments service not initialized');
    }

    const formData = new URLSearchParams();
    formData.append('entityId', this.config.entityId);
    formData.append('paymentType', 'RF'); // Refund
    if (amount) {
      formData.append('amount', amount.toFixed(2));
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/v1/payments/${paymentId}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.result?.description || 'Refund failed',
        };
      }

      return {
        success: true,
        refundId: data.id,
        message: 'Refund processed successfully',
      };
    } catch (error) {
      console.error('Peach Payments refund error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Refund failed',
      };
    }
  }
}