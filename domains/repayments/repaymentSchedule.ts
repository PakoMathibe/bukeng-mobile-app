// domains/repayments/repaymentSchedule.ts
import { Instalment } from '@/types/transaction';
import { addDays, differenceInDays, isAfter, isBefore } from 'date-fns';

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
  completionPercentage: number;
  estimatedCompletionDate: Date | null;
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
  totalWithLateFee: number;
}

export class RepaymentScheduleBuilder {
  /**
   * Build a repayment schedule from instalments
   */
  static build(
    instalments: Instalment[],
    order: { merchantName: string }
  ): RepaymentSchedule {
    if (!instalments || instalments.length === 0) {
      return this.emptySchedule(order.merchantName);
    }

    const now = new Date();
    let totalPaid = 0;
    let totalAmount = 0;
    let overdueAmount = 0;
    let overdueDays = 0;
    let nextDueDate: Date | null = null;
    let nextAmount = 0;
    let lastPaidDate: Date | null = null;

    const scheduleInstalments: RepaymentScheduleInstalment[] = instalments.map(
      (inst, index) => {
        const totalWithLateFee = inst.amount + (inst.lateFee || 0);
        totalAmount += totalWithLateFee;

        if (inst.status === 'paid') {
          totalPaid += totalWithLateFee;
          if (inst.paidAt && (!lastPaidDate || inst.paidAt > lastPaidDate)) {
            lastPaidDate = inst.paidAt;
          }
        }

        const isOverdue = inst.status === 'pending' && isAfter(now, inst.dueDate);
        if (isOverdue) {
          overdueAmount += totalWithLateFee;
          const days = differenceInDays(now, inst.dueDate);
          overdueDays = Math.max(overdueDays, days);
        }

        if (inst.status === 'pending' && !nextDueDate) {
          nextDueDate = inst.dueDate;
          nextAmount = totalWithLateFee;
        }

        const remainingDays =
          inst.status === 'pending'
            ? Math.max(0, differenceInDays(inst.dueDate, now))
            : null;

        return {
          id: inst.id,
          number: index + 1,
          amount: inst.amount,
          dueDate: inst.dueDate,
          paidAt: inst.paidAt,
          status:
            inst.status === 'pending' && isAfter(now, inst.dueDate)
              ? 'late'
              : inst.status,
          lateFee: inst.lateFee || 0,
          remainingDays,
          totalWithLateFee,
        };
      }
    );

    const remainingAmount = totalAmount - totalPaid;
    const completionPercentage = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

    // Calculate estimated completion date based on payment cadence
    let estimatedCompletionDate: Date | null = null;
    if (remainingAmount > 0 && nextDueDate && scheduleInstalments.length > 0) {
      const avgPaymentInterval = this.calculateAveragePaymentInterval(scheduleInstalments);
      const remainingInstalments = scheduleInstalments.filter(i => i.status === 'pending').length;
      estimatedCompletionDate = addDays(nextDueDate, avgPaymentInterval * remainingInstalments);
    }

    return {
      orderId: instalments[0]?.orderId || '',
      merchantName: order.merchantName,
      totalAmount,
      totalPaid,
      remainingAmount,
      instalments: scheduleInstalments,
      nextDueDate,
      nextAmount,
      isOverdue: overdueAmount > 0,
      overdueAmount,
      overdueDays,
      completionPercentage: Math.round(completionPercentage),
      estimatedCompletionDate,
    };
  }

  /**
   * Create an empty schedule (no instalments)
   */
  static emptySchedule(merchantName: string): RepaymentSchedule {
    return {
      orderId: '',
      merchantName,
      totalAmount: 0,
      totalPaid: 0,
      remainingAmount: 0,
      instalments: [],
      nextDueDate: null,
      nextAmount: 0,
      isOverdue: false,
      overdueAmount: 0,
      overdueDays: 0,
      completionPercentage: 0,
      estimatedCompletionDate: null,
    };
  }

  /**
   * Calculate average payment interval in days
   */
  private static calculateAveragePaymentInterval(
    instalments: RepaymentScheduleInstalment[]
  ): number {
    const paidInstalments = instalments.filter(i => i.paidAt && i.status === 'paid');
    
    if (paidInstalments.length < 2) {
      return 30; // Default to 30 days
    }

    let totalInterval = 0;
    for (let i = 1; i < paidInstalments.length; i++) {
      const prev = paidInstalments[i - 1];
      const current = paidInstalments[i];
      if (prev.paidAt && current.paidAt) {
        const interval = differenceInDays(current.paidAt, prev.paidAt);
        totalInterval += interval;
      }
    }

    return Math.round(totalInterval / (paidInstalments.length - 1));
  }

  /**
   * Check if schedule is behind (overdue or next payment is late)
   */
  static isBehindSchedule(schedule: RepaymentSchedule): boolean {
    if (schedule.overdueAmount > 0) return true;
    if (schedule.nextDueDate && isBefore(schedule.nextDueDate, new Date())) return true;
    return false;
  }

  /**
   * Get schedule health status
   */
  static getScheduleHealth(schedule: RepaymentSchedule): 'healthy' | 'at-risk' | 'defaulted' {
    if (schedule.overdueDays > 90) return 'defaulted';
    if (schedule.overdueDays > 30) return 'at-risk';
    if (schedule.overdueAmount > 0) return 'at-risk';
    return 'healthy';
  }

  /**
   * Get the next upcoming payment (overdue takes priority)
   */
  static getNextPriorityPayment(schedule: RepaymentSchedule): RepaymentScheduleInstalment | null {
    // Check for overdue first
    const overdue = schedule.instalments.find(i => i.status === 'late');
    if (overdue) return overdue;
    
    // Then upcoming
    const upcoming = schedule.instalments.find(i => i.status === 'pending');
    return upcoming || null;
  }

  /**
   * Calculate total late fees accrued
   */
  static getTotalLateFees(schedule: RepaymentSchedule): number {
    return schedule.instalments.reduce((sum, inst) => sum + (inst.lateFee || 0), 0);
  }

  /**
   * Get payment history summary
   */
  static getPaymentSummary(schedule: RepaymentSchedule): {
    onTimePayments: number;
    latePayments: number;
    onTimeRate: number;
  } {
    const paidInstalments = schedule.instalments.filter(i => i.status === 'paid');
    const lateInstalments = paidInstalments.filter(i => {
      if (!i.paidAt) return false;
      return isAfter(i.paidAt, i.dueDate);
    });
    
    const onTimePayments = paidInstalments.length - lateInstalments.length;
    const onTimeRate = paidInstalments.length > 0 
      ? (onTimePayments / paidInstalments.length) * 100 
      : 0;

    return {
      onTimePayments,
      latePayments: lateInstalments.length,
      onTimeRate: Math.round(onTimeRate),
    };
  }
}