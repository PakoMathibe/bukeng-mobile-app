// modules/PaymentProcessor/processPayment.ts
export interface PaymentRequest {
  orderId: string;
  amount: number;
  paymentMethod: 'debit_order' | 'card' | 'qr';
  customerId: string;
  merchantId: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed';
  message?: string;
  errorCode?: string;
}

export class PaymentProcessor {
  static async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    // Validate payment
    const validation = this.validatePayment(request);
    if (!validation.valid) {
      return {
        success: false,
        status: 'failed',
        message: validation.message,
        errorCode: validation.errorCode,
      };
    }

    // Process based on payment method
    try {
      let result: PaymentResult;

      switch (request.paymentMethod) {
        case 'debit_order':
          result = await this.processDebitOrder(request);
          break;
        case 'card':
          result = await this.processCardPayment(request);
          break;
        case 'qr':
          result = await this.processQRPayment(request);
          break;
        default:
          return {
            success: false,
            status: 'failed',
            message: 'Invalid payment method',
          };
      }

      return result;
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        message: 'Payment processing failed',
        errorCode: 'PROCESSING_ERROR',
      };
    }
  }

  private static validatePayment(request: PaymentRequest): {
    valid: boolean;
    message?: string;
    errorCode?: string;
  } {
    if (!request.orderId) {
      return {
        valid: false,
        message: 'Order ID required',
        errorCode: 'MISSING_ORDER_ID',
      };
    }

    if (request.amount <= 0) {
      return {
        valid: false,
        message: 'Invalid amount',
        errorCode: 'INVALID_AMOUNT',
      };
    }

    if (request.amount > 5000) {
      return {
        valid: false,
        message: 'Amount exceeds maximum limit',
        errorCode: 'EXCEEDS_LIMIT',
      };
    }

    return { valid: true };
  }

  private static async processDebitOrder(
    request: PaymentRequest
  ): Promise<PaymentResult> {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate success (in production, integrate with actual payment gateway)
    return {
      success: true,
      transactionId: `TXN_${Date.now()}`,
      status: 'completed',
    };
  }

  private static async processCardPayment(
    request: PaymentRequest
  ): Promise<PaymentResult> {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return {
      success: true,
      transactionId: `TXN_${Date.now()}`,
      status: 'completed',
    };
  }

  private static async processQRPayment(
    request: PaymentRequest
  ): Promise<PaymentResult> {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      success: true,
      transactionId: `TXN_${Date.now()}`,
      status: 'completed',
    };
  }
}
