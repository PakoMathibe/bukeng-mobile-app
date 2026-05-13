// domains/repayments/repaymentSchedule.ts
import { Instalment } from '@/types/transaction';

export interface RepaymentSchedule {
  orderId: string;
  merchantName: string;
  totalAmount: number;
  totalPaid: number;
  remainingAmount: number;
  instalments: RepaymentScheduleInstalment[];
  nextDueDate: Date | null;
  nextAmount: number;
  isOverdue: boolean;
  overdueAmount: number;
  overdueDays: number;
}

export interface RepaymentScheduleInstalment {
  id: string;
  number: number;
  amount: number;
  dueDate: Date;
  paidAt: Date | null;
  status: 'pending' | 'paid' | 'late';
  lateFee: number;
  remainingDays: number | null;
}

export class RepaymentScheduleBuilder {
  static build(
    instalments: Instalment[],
    order: { merchantName: string }
  ): RepaymentSchedule {
    const now = new Date();
    let totalPaid = 0;
    let totalAmount = 0;
    let overdueAmount = 0;
    let overdueDays = 0;
    let nextDueDate: Date | null = null;
    let nextAmount = 0;

    const scheduleInstalments: RepaymentScheduleInstalment[] = instalments.map(
      (inst, index) => {
        totalAmount += inst.amount + inst.lateFee;

        if (inst.status === 'paid') {
          totalPaid += inst.amount + inst.lateFee;
        }

        const isOverdue = inst.status === 'pending' && now > inst.dueDate;
        if (isOverdue) {
          overdueAmount += inst.amount + inst.lateFee;
          const days = Math.floor(
            (now.getTime() - inst.dueDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          overdueDays = Math.max(overdueDays, days);
        }

        if (inst.status === 'pending' && !nextDueDate) {
          nextDueDate = inst.dueDate;
          nextAmount = inst.amount + inst.lateFee;
        }

        return {
          id: inst.id,
          number: index + 1,
          amount: inst.amount,
          dueDate: inst.dueDate,
          paidAt: inst.paidAt,
          status:
            inst.status === 'pending' && now > inst.dueDate
              ? 'late'
              : inst.status,
          lateFee: inst.lateFee,
          remainingDays:
            inst.status === 'pending'
              ? Math.max(
                  0,
                  Math.ceil(
                    (inst.dueDate.getTime() - now.getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                )
              : null,
        };
      }
    );

    return {
      orderId: instalments[0]?.orderId || '',
      merchantName: order.merchantName,
      totalAmount,
      totalPaid,
      remainingAmount: totalAmount - totalPaid,
      instalments: scheduleInstalments,
      nextDueDate,
      nextAmount,
      isOverdue: overdueAmount > 0,
      overdueAmount,
      overdueDays,
    };
  }
}
