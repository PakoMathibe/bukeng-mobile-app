// domains/repayments/repaymentService.ts
import { supabase } from '@/services/supabase/client';
import { Instalment, Order, Transaction } from '@/types/transaction';
import { AppError, NotFoundError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { addDays, differenceInDays, isAfter } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { PaymentProcessor } from '@/modules/PaymentProcessor/processPayment';
import { CreditService } from '@/domains/credit/creditService';
import { PaymentService } from '@/domains/payments/paymentService';

export class RepaymentService {
  /**
   * Create an instalment record in the database
   */
  static async createInstalment(
    userId: string,
    instalment: Instalment
  ): Promise<Instalment> {
    try {
      // Create repayment record in database
      const { data, error } = await supabase
        .from('repayments')
        .insert({
          id: instalment.id,
          installment_plan_id: instalment.installmentPlanId,
          due_date: instalment.dueDate.toISOString().split('T')[0],
          amount_due: instalment.amount,
          amount_paid: 0,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create instalment:', error);
        throw new AppError('Failed to create instalment', 'INSTALMENT_CREATE_ERROR', 500);
      }

      logger.info(`Instalment created for user ${userId}`, {
        instalmentId: instalment.id,
      });
      
      return {
        ...instalment,
        id: data.id,
      };
    } catch (error) {
      logger.error('Failed to create instalment', error);
      throw error;
    }
  }

  /**
   * Get instalment by ID
   */
  static async getInstalment(instalmentId: string): Promise<Instalment> {
    try {
      const { data, error } = await supabase
        .from('repayments')
        .select('*, installment_plans(transaction_id)')
        .eq('id', instalmentId)
        .single();

      if (error || !data) {
        throw new NotFoundError(`Instalment ${instalmentId}`);
      }

      return {
        id: data.id,
        orderId: data.installment_plans?.transaction_id,
        installmentPlanId: data.installment_plan_id,
        amount: data.amount_due,
        dueDate: new Date(data.due_date),
        paidAt: data.paid_at ? new Date(data.paid_at) : null,
        status: data.status,
        lateFee: 0, // Calculate dynamically
        paymentId: null,
        reminderSent: false,
        reminderCount: 0,
      };
    } catch (error) {
      logger.error('Failed to get instalment', error);
      throw error;
    }
  }

  /**
   * Get all instalments for a user
   */
  static async getUserInstalments(userId: string): Promise<Instalment[]> {
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

      // Get all installment plans for those transactions
      const { data: plans, error: planError } = await supabase
        .from('installment_plans')
        .select('id')
        .in('transaction_id', transactionIds);

      if (planError || !plans) return [];

      const planIds = plans.map(p => p.id);
      
      if (planIds.length === 0) return [];

      // Get all repayments for those installment plans
      const { data: repayments, error: repError } = await supabase
        .from('repayments')
        .select('*')
        .in('installment_plan_id', planIds)
        .order('due_date', { ascending: true });

      if (repError) return [];

      return repayments.map(r => ({
        id: r.id,
        orderId: '',
        installmentPlanId: r.installment_plan_id,
        amount: r.amount_due,
        dueDate: new Date(r.due_date),
        paidAt: r.paid_at ? new Date(r.paid_at) : null,
        status: r.status,
        lateFee: 0,
        paymentId: null,
        reminderSent: false,
        reminderCount: 0,
      }));
    } catch (error) {
      logger.error('Failed to get user instalments', error);
      return [];
    }
  }

  /**
   * Get upcoming instalments for a user
   */
  static async getUpcomingInstalments(userId: string): Promise<Instalment[]> {
    try {
      const instalments = await this.getUserInstalments(userId);
      const now = new Date();
      return instalments.filter(
        (i) => i.status === 'pending' && !isAfter(now, i.dueDate)
      );
    } catch (error) {
      logger.error('Failed to get upcoming instalments', error);
      return [];
    }
  }

  /**
   * Get overdue instalments for a user
   */
  static async getOverdueInstalments(userId: string): Promise<Instalment[]> {
    try {
      const instalments = await this.getUserInstalments(userId);
      const now = new Date();
      return instalments.filter(
        (i) => i.status === 'pending' && isAfter(now, i.dueDate)
      );
    } catch (error) {
      logger.error('Failed to get overdue instalments', error);
      return [];
    }
  }

  /**
   * Make a repayment for an instalment
   */
  static async makeRepayment(
    userId: string,
    instalmentId: string,
    amount: number
  ): Promise<Transaction> {
    try {
      const instalment = await this.getInstalment(instalmentId);

      if (instalment.status === 'paid') {
        throw new AppError('Instalment already paid', 'ALREADY_PAID', 400);
      }

      // Calculate late fee if applicable
      const now = new Date();
      let lateFee = 0;
      if (isAfter(now, instalment.dueDate)) {
        const daysLate = differenceInDays(now, instalment.dueDate);
        const periodsLate = Math.floor(daysLate / 30);
        lateFee = Math.min(periodsLate * 35, 100);
      }

      const totalAmount = instalment.amount + lateFee;

      if (amount < totalAmount) {
        throw new ValidationError(
          `Amount must be at least R${totalAmount} to cover instalment and any late fees`
        );
      }

      // Process payment
      const paymentResult = await PaymentProcessor.processPayment({
        orderId: instalment.orderId,
        amount: totalAmount,
        paymentMethod: 'debit_order',
        customerId: userId,
        merchantId: '',
      });

      if (!paymentResult.success) {
        throw new AppError(
          paymentResult.message || 'Repayment failed',
          'PAYMENT_FAILED',
          400
        );
      }

      // Update instalment in database
      const { error: updateError } = await supabase
        .from('repayments')
        .update({
          status: 'paid',
          paid_at: now.toISOString(),
          amount_paid: instalment.amount,
        })
        .eq('id', instalmentId);

      if (updateError) {
        logger.error('Failed to update instalment:', updateError);
        throw new AppError('Failed to update repayment', 'UPDATE_ERROR', 500);
      }

      // Create transaction record
      const transactionId = paymentResult.transactionId || uuidv4();
      const transaction: Transaction = {
        id: transactionId,
        userId,
        orderId: instalment.orderId,
        type: 'repayment',
        amount: instalment.amount,
        fee: lateFee,
        total: totalAmount,
        status: 'completed',
        reference: `repayment_${instalmentId}`,
        metadata: {
          instalmentId,
          lateFee,
        },
        createdAt: new Date(),
        completedAt: new Date(),
      };

      // Update credit profile
      await CreditService.updateAfterPayment(
        userId,
        instalment.amount,
        lateFee === 0
      );

      logger.info(`Repayment made for instalment ${instalmentId}`, {
        transactionId: transaction.id,
      });

      return transaction;
    } catch (error) {
      logger.error('Failed to make repayment', error);
      throw error;
    }
  }

  /**
   * Get repayment schedule summary for a user
   */
  static async getRepaymentSchedule(userId: string): Promise<{
    totalDue: number;
    upcoming: Instalment[];
    overdue: Instalment[];
    completed: Instalment[];
  }> {
    try {
      const allInstalments = await this.getUserInstalments(userId);
      const now = new Date();

      const upcoming = allInstalments.filter(
        (i) => i.status === 'pending' && !isAfter(now, i.dueDate)
      );
      const overdue = allInstalments.filter(
        (i) => i.status === 'pending' && isAfter(now, i.dueDate)
      );
      const completed = allInstalments.filter((i) => i.status === 'paid');

      const totalDue = [...upcoming, ...overdue].reduce(
        (sum, i) => sum + i.amount,
        0
      );

      return {
        totalDue,
        upcoming,
        overdue,
        completed,
      };
    } catch (error) {
      logger.error('Failed to get repayment schedule', error);
      return {
        totalDue: 0,
        upcoming: [],
        overdue: [],
        completed: [],
      };
    }
  }

  /**
   * Send payment reminders for upcoming instalments
   */
  static async sendPaymentReminders(): Promise<void> {
    try {
      // Get all pending repayments
      const { data: repayments, error } = await supabase
        .from('repayments')
        .select('*, installment_plans(transaction_id)')
        .eq('status', 'pending')
        .eq('reminder_sent', false);

      if (error) {
        logger.error('Failed to fetch repayments for reminders:', error);
        return;
      }

      const now = new Date();

      for (const repayment of repayments || []) {
        const dueDate = new Date(repayment.due_date);
        const daysUntilDue = differenceInDays(dueDate, now);

        // Send reminder 2 days before due and 1 day before due
        if ((daysUntilDue === 2 || daysUntilDue === 1) && !repayment.reminder_sent) {
          // In production, send SMS/push notification here
          logger.info(`Payment reminder sent for instalment ${repayment.id}`, {
            dueDate: repayment.due_date,
            daysUntilDue,
          });

          // Mark reminder as sent
          await supabase
            .from('repayments')
            .update({ 
              reminder_sent: true,
              reminder_count: (repayment.reminder_count || 0) + 1,
              last_reminder_sent: now.toISOString(),
            })
            .eq('id', repayment.id);
        }
      }
    } catch (error) {
      logger.error('Failed to send payment reminders', error);
    }
  }

  /**
   * Get repayment statistics for a user
   */
  static async getRepaymentStats(userId: string): Promise<{
    totalRepaid: number;
    totalLateFees: number;
    onTimePaymentRate: number;
    activeInstalments: number;
  }> {
    try {
      const { completed, overdue, upcoming } = await this.getRepaymentSchedule(userId);
      
      const totalRepaid = completed.reduce((sum, i) => sum + i.amount, 0);
      const totalLateFees = completed.reduce((sum, i) => sum + (i.lateFee || 0), 0);
      const onTimeRate = completed.length > 0 
        ? (completed.filter(i => i.lateFee === 0).length / completed.length) * 100 
        : 100;
      const activeInstalments = overdue.length + upcoming.length;

      return {
        totalRepaid,
        totalLateFees,
        onTimePaymentRate: Math.round(onTimeRate),
        activeInstalments,
      };
    } catch (error) {
      logger.error('Failed to get repayment stats', error);
      return {
        totalRepaid: 0,
        totalLateFees: 0,
        onTimePaymentRate: 100,
        activeInstalments: 0,
      };
    }
  }
}