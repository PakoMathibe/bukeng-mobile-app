// domains/repayments/repaymentTypes.ts
export interface RepaymentRequest {
  instalmentId: string;
  amount: number;
  paymentMethodId: string;
}

export interface RepaymentResponse {
  success: boolean;
  transactionId?: string;
  message?: string;
  receipt?: RepaymentReceipt;
}

export interface RepaymentReceipt {
  id: string;
  instalmentId: string;
  orderId: string;
  amount: number;
  lateFee: number;
  total: number;
  date: Date;
  status: 'completed' | 'pending' | 'failed';
  reference: string;
}

export interface RepaymentSummary {
  totalOutstanding: number;
  totalOverdue: number;
  nextPaymentDate: Date | null;
  nextPaymentAmount: number;
  onTimePaymentRate: number;
  completionRate: number;
}
