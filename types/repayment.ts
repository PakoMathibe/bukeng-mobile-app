// types/repayment.ts
export interface RepaymentSchedule {
  orderId: string;
  merchantName: string;
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

export interface RepaymentInstalment {
  id: string;
  orderId: string;
  amount: number;
  dueDate: Date;
  paidAt: Date | null;
  status: 'pending' | 'paid' | 'late' | 'written_off';
  lateFee: number;
  lateFeePaid: boolean;
  paymentId: string | null;
  reminderCount: number;
  lastReminderSent: Date | null;
}

export interface RepaymentPlan {
  id: string;
  userId: string;
  orderId: string;
  totalAmount: number;
  instalmentCount: number;
  instalmentAmount: number;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'completed' | 'defaulted';
  createdAt: Date;
  updatedAt: Date;
}
