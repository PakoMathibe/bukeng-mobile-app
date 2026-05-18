// services/payments/ozow.ts
import crypto from 'crypto';

export interface OzowConfig {
  siteCode: string;
  privateKey: string;
  countryCode?: string;
  currencyCode?: string;
  isTest?: boolean;
}

export interface InitiatePaymentRequest {
  amount: number;
  reference: string;
  customerEmail: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerMobile?: string;
  successUrl?: string;
  errorUrl?: string;
  cancelUrl?: string;
  notifyUrl?: string;
}

export interface InitiatePaymentResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  transactionId?: string;
  amount?: number;
  status?: 'Pending' | 'Complete' | 'Failed' | 'Cancelled';
  reference?: string;
  customerEmail?: string;
  errorMessage?: string;
}

export class OzowService {
  private static config: OzowConfig | null = null;
  private static readonly API_URL = 'https://api.ozow.com';
  private static readonly SANDBOX_URL = 'https://sandbox.ozow.com';

  /**
   * Initialize Ozow payment service
   */
  static initialize(config: OzowConfig): void {
    if (!config.siteCode) {
      throw new Error('Ozow siteCode is required');
    }
    if (!config.privateKey) {
      throw new Error('Ozow privateKey is required');
    }
    this.config = config;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Ozow service initialized for site: ${config.siteCode}`);
    }
  }

  /**
   * Generate HMAC signature for request validation
   */
  private static generateSignature(data: Record<string, string | number>): string {
    // Sort keys alphabetically
    const sortedKeys = Object.keys(data).sort();
    const stringToSign = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
    
    // Create HMAC-SHA512 signature
    const signature = crypto
      .createHmac('sha512', this.config!.privateKey)
      .update(stringToSign)
      .digest('hex');
    
    return signature;
  }

  /**
   * Get base API URL based on environment
   */
  private static getBaseUrl(): string {
    if (this.config?.isTest) {
      return this.SANDBOX_URL;
    }
    return this.API_URL;
  }

  /**
   * Initiate a payment
   */
  static async initiatePayment(data: InitiatePaymentRequest): Promise<InitiatePaymentResponse> {
    if (!this.config) {
      throw new Error('Ozow service not initialized. Call initialize() first.');
    }

    // Validate required fields
    if (!data.amount || data.amount <= 0) {
      return {
        success: false,
        errorCode: 'INVALID_AMOUNT',
        errorMessage: 'Amount must be greater than 0',
      };
    }
    
    if (!data.reference) {
      return {
        success: false,
        errorCode: 'INVALID_REFERENCE',
        errorMessage: 'Transaction reference is required',
      };
    }
    
    if (!data.customerEmail) {
      return {
        success: false,
        errorCode: 'INVALID_EMAIL',
        errorMessage: 'Customer email is required',
      };
    }

    const requestData = {
      SiteCode: this.config.siteCode,
      CountryCode: this.config.countryCode || 'ZA',
      CurrencyCode: this.config.currencyCode || 'ZAR',
      Amount: data.amount.toFixed(2),
      TransactionReference: data.reference,
      CustomerEmail: data.customerEmail,
      CustomerFirstName: data.customerFirstName || '',
      CustomerLastName: data.customerLastName || '',
      CustomerMobile: data.customerMobile || '',
      SuccessUrl: data.successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment-success`,
      ErrorUrl: data.errorUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment-error`,
      CancelUrl: data.cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment-cancelled`,
      NotifyUrl: data.notifyUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/ozow-webhook`,
      IsTest: this.config.isTest ? 'true' : 'false',
    };

    // Generate signature
    const signature = this.generateSignature(requestData);
    const requestBody = {
      ...requestData,
      Signature: signature,
    };

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/Request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          errorCode: responseData.ErrorCode,
          errorMessage: responseData.ErrorMessage || 'Payment initiation failed',
        };
      }

      return {
        success: true,
        paymentUrl: responseData.PaymentUrl,
        transactionId: responseData.TransactionId,
      };
    } catch (error) {
      console.error('Ozow payment initiation error:', error);
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  /**
   * Verify payment status using transaction ID or reference
   */
  static async verifyPayment(
    siteCode: string,
    referenceOrTransactionId: string
  ): Promise<VerifyPaymentResponse> {
    if (!this.config) {
      throw new Error('Ozow service not initialized. Call initialize() first.');
    }

    if (!siteCode || siteCode !== this.config.siteCode) {
      return {
        success: false,
        errorMessage: 'Invalid site code',
      };
    }

    if (!referenceOrTransactionId) {
      return {
        success: false,
        errorMessage: 'Transaction reference or ID is required',
      };
    }

    const requestData = {
      SiteCode: this.config.siteCode,
      TransactionReference: referenceOrTransactionId,
    };

    const signature = this.generateSignature(requestData);
    const requestBody = {
      ...requestData,
      Signature: signature,
    };

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/Query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          errorMessage: data.ErrorMessage || 'Payment verification failed',
        };
      }

      let status: VerifyPaymentResponse['status'] = 'Pending';
      if (data.TransactionStatus === 2) status = 'Complete';
      else if (data.TransactionStatus === 3) status = 'Failed';
      else if (data.TransactionStatus === 4) status = 'Cancelled';

      return {
        success: true,
        transactionId: data.TransactionId,
        amount: parseFloat(data.Amount),
        status,
        reference: data.TransactionReference,
        customerEmail: data.CustomerEmail,
      };
    } catch (error) {
      console.error('Ozow payment verification error:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  /**
   * Handle webhook notification from Ozow
   */
  static async handleWebhook(payload: any): Promise<{
    verified: boolean;
    transactionId?: string;
    status?: string;
  }> {
    if (!this.config) {
      throw new Error('Ozow service not initialized');
    }

    // Verify the webhook signature
    const receivedSignature = payload.Signature;
    const payloadWithoutSignature = { ...payload };
    delete payloadWithoutSignature.Signature;

    const expectedSignature = this.generateSignature(payloadWithoutSignature);

    if (receivedSignature !== expectedSignature) {
      console.warn('Ozow webhook: Invalid signature');
      return { verified: false };
    }

    return {
      verified: true,
      transactionId: payload.TransactionId,
      status: payload.TransactionStatus === '2' ? 'Complete' : 
              payload.TransactionStatus === '3' ? 'Failed' : 'Pending',
    };
  }

  /**
   * Refund a payment (requires additional permissions)
   */
  static async refundPayment(transactionId: string, amount?: number): Promise<{
    success: boolean;
    refundId?: string;
    errorMessage?: string;
  }> {
    if (!this.config) {
      throw new Error('Ozow service not initialized');
    }

    const requestData = {
      SiteCode: this.config.siteCode,
      TransactionId: transactionId,
      Amount: amount?.toFixed(2) || '',
    };

    const signature = this.generateSignature(requestData);
    const requestBody = {
      ...requestData,
      Signature: signature,
    };

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/Refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          errorMessage: data.ErrorMessage || 'Refund failed',
        };
      }

      return {
        success: true,
        refundId: data.RefundId,
      };
    } catch (error) {
      console.error('Ozow refund error:', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }
}