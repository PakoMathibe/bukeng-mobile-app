// types/repayment.ts

export interface RepaymentInstalment {
  id: string;                    // maps to repayments.id
  installmentPlanId: string;     // maps to installment_plan_id
  amountDue: number;             // maps to amount_due
  amountPaid: number;            // maps to amount_paid
  dueDate: Date;                 // maps to due_date
  paidAt: Date | null;           // maps to paid_at (add to DB if not exists)
  status: 'pending' | 'paid' | 'late' | 'written_off';
  lateFee: number;               // calculated field - NOT in DB
}

export interface RepaymentSchedule {
  orderId: string;               // maps to transaction_id
  merchantName: string;          // from JOIN with merchants table
  totalAmount: number;
  totalPaid: number;
  remainingAmount: number;
  instalments: RepaymentInstalment[];
  nextDueDate: Date | null;
  nextAmount: number;
  isOverdue: boolean;
  overdueAmount: number;
  overdueDays: number;
}

export interface InstallmentPlan {
  id: string;                    // maps to installment_plans.id
  transactionId: string;         // maps to transaction_id
  numberOfInstallments: number;  // maps to number_of_installments
  installmentAmount: number;     // maps to installment_amount
  startDate: Date;               // maps to start_date
  endDate: Date;                 // maps to end_date
  status: 'active' | 'completed' | 'defaulted';
  createdAt: Date;               // maps to created_at
  updatedAt: Date;               // maps to updated_at
}