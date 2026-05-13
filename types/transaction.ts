// types/transaction.ts
export type TransactionType =
  | 'purchase'
  | 'repayment'
  | 'late_fee'
  | 'adjustment';
export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded';
export type OrderStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'defaulted'
  | 'disputed';
export type InstalmentStatus = 'pending' | 'paid' | 'late' | 'written_off';

export interface Transaction {
  id: string;
  userId: string;
  orderId: string | null;
  type: TransactionType;
  amount: number;
  fee: number;
  total: number;
  status: TransactionStatus;
  reference: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  completedAt: Date | null;
}

export interface Order {
  id: string;
  userId: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  serviceFee: number;
  totalAmount: number;
  status: OrderStatus;
  instalments: Instalment[];
  createdAt: Date;
  updatedAt: Date;
  paidAt: Date | null;
  paymentMethod: 'qr' | 'online' | 'manual';
}

export interface Instalment {
  id: string;
  orderId: string;
  amount: number;
  dueDate: Date;
  paidAt: Date | null;
  status: InstalmentStatus;
  lateFee: number;
  paymentId: string | null;
  reminderSent: boolean;
  reminderCount: number;
}

export interface PaymentIntent {
  id: string;
  orderId: string;
  amount: number;
  fee: number;
  total: number;
  status:
    | 'requires_confirmation'
    | 'confirmed'
    | 'processing'
    | 'succeeded'
    | 'failed';
  clientSecret: string;
  paymentMethodTypes: string[];
  createdAt: Date;
  expiresAt: Date;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: 'debit_order' | 'card' | 'qr';
  isDefault: boolean;
  lastFour: string;
  expiryDate: Date | null;
  createdAt: Date;
}
