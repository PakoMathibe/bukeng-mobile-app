// domains/user/history/repaymentHistory.ts
import { supabase } from '@/services/supabase/client';
import { Instalment } from '@/types/transaction';
import { AppError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { isAfter, differenceInDays } from 'date-fns';

export class RepaymentHistoryService {
  /**
   * Get all repayment history for a user
   */
  static async getRepaymentHistory(userId: string): Promise<Instalment[]> {
    try {
      // Get all transactions for the user
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', userId);

      if (txError) {
        logger.error('Failed to get user transactions:', txError);
        return [];
      }

      const transactionIds = transactions.map(t => t.id);
      if (transactionIds.length === 0) return [];

      // Get installment plans
      const { data: plans, error: planError } = await supabase
        .from('installment_plans')
        .select('id')
        .in('transaction_id', transactionIds);

      if (planError || !plans) return [];

      const planIds = plans.map(p => p.id);
      if (planIds.length === 0) return [];

      // Get repayments
      const { data: repayments, error: repError } = await supabase
        .from('repayments')
        .select('*')
        .in('installment_plan_id', planIds)
        .order('due_date', { ascending: false });

      if (repError) {
        logger.error('Failed to get repayments:', repError);
        return [];
      }

      return repayments.map(r => ({
        id: r.id,
        orderId: '',
        installmentPlanId: r.installment_plan_id,
        amount: r.amount_due,
        dueDate: new Date(r.due_date),
        paidAt: r.paid_at ? new Date(r.paid_at) : null,
        status: r.status,
        lateFee: this.calculateLateFee(new Date(r.due_date), r.paid_at ? new Date(r.paid_at) : null),
        paymentId: null,
        reminderSent: false,
        reminderCount: 0,
      }));
    } catch (error) {
      logger.error('Failed to get repayment history', error);
      return [];
    }
  }

  /**
   * Get upcoming repayments (not overdue)
   */
  static async getUpcomingRepayments(userId: string): Promise<Instalment[]> {
    try {
      const instalments = await this.getRepaymentHistory(userId);
      const now = new Date();
      return instalments.filter(
        (i) => i.status === 'pending' && !isAfter(now, i.dueDate)
      );
    } catch (error) {
      logger.error('Failed to get upcoming repayments', error);
      return [];
    }
  }

  /**
   * Get overdue repayments
   */
  static async getOverdueRepayments(userId: string): Promise<Instalment[]> {
    try {
      const instalments = await this.getRepaymentHistory(userId);
      const now = new Date();
      return instalments.filter(
        (i) => i.status === 'pending' && isAfter(now, i.dueDate)
      );
    } catch (error) {
      logger.error('Failed to get overdue repayments', error);
      return [];
    }
  }

  /**
   * Get repayment statistics for a user
   */
  static async getRepaymentStats(userId: string): Promise<{
    totalDue: number;
    totalPaid: number;
    overdueAmount: number;
    onTimeRate: number;
    nextDueDate: Date | null;
    nextDueAmount: number;
  }> {
    try {
      const instalments = await this.getRepaymentHistory(userId);

      const totalDue = instalments.reduce(
        (sum, i) => sum + i.amount,
        0
      );
      const totalPaid = instalments
        .filter((i) => i.status === 'paid')
        .reduce((sum, i) => sum + i.amount, 0);

      const overdueInstalments = await this.getOverdueRepayments(userId);
      const overdueAmount = overdueInstalments.reduce(
        (sum, i) => sum + i.amount,
        0
      );

      const totalCompleted = instalments.filter((i) => i.status === 'paid').length;
      const onTimePayments = instalments.filter(
        (i) => i.status === 'paid' && i.paidAt && i.paidAt <= i.dueDate
      ).length;
      const onTimeRate = totalCompleted > 0 ? onTimePayments / totalCompleted : 1;

      const upcoming = await this.getUpcomingRepayments(userId);
      const nextUpcoming = upcoming.sort(
        (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
      )[0];

      return {
        totalDue,
        totalPaid,
        overdueAmount,
        onTimeRate: Math.round(onTimeRate * 100),
        nextDueDate: nextUpcoming?.dueDate || null,
        nextDueAmount: nextUpcoming?.amount || 0,
      };
    } catch (error) {
      logger.error('Failed to get repayment stats', error);
      return {
        totalDue: 0,
        totalPaid: 0,
        overdueAmount: 0,
        onTimeRate: 100,
        nextDueDate: null,
        nextDueAmount: 0,
      };
    }
  }

  /**
   * Calculate late fee based on due date and payment date
   */
  static calculateLateFee(dueDate: Date, paidAt: Date | null): number {
    if (!paidAt) return 0;
    if (paidAt <= dueDate) return 0;

    const daysLate = differenceInDays(paidAt, dueDate);
    const periodsLate = Math.floor(daysLate / 30);
    const fee = periodsLate * 35;
    return Math.min(fee, 100);
  }
}