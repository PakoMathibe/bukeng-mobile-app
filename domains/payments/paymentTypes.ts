// domains/payments/paymentTypes.ts
export interface PaymentMethod {
  id: string;
  type: 'card' | 'debit_order' | 'qr';
  isDefault: boolean;
  lastFour?: string;
  expiryDate?: Date;
  bankName?: string;
  accountName?: string;
}

export interface PaymentRequest {
  orderId: string;
  paymentMethodId: string;
  savePaymentMethod?: boolean;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed';
  message?: string;
  receipt?: PaymentReceipt;
}

export interface PaymentReceipt {
  id: string;
  orderId: string;
  amount: number;
  fee: number;
  total: number;
  date: Date;
  merchantName: string;
  transactionId: string;
  paymentMethod: string;
  instalments: Array<{
    number: number;
    amount: number;
    dueDate: Date;
  }>;
}

export interface SavedPaymentMethod {
  id: string;
  userId: string;
  type: 'card' | 'debit_order';
  isDefault: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
  metadata: Record<string, unknown>;
}
