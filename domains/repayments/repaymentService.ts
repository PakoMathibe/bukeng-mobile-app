// domains/repayments/repaymentService.ts
import { Instalment, Order } from '@/types/transaction';
import { AppError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { addDays, differenceInDays, isAfter } from 'date-fns';

// Mock databases
const instalmentDatabase: Map<string, Instalment> = new Map();
const repaymentTransactionDatabase: Map<string, Transaction> = new Map();

export class RepaymentService {
  static async createInstalment(
    userId: string,
    instalment: Instalment
  ): Promise<Instalment> {
    try {
      instalmentDatabase.set(instalment.id, instalment);
      logger.info(`Instalment created for user ${userId}`, {
        instalmentId: instalment.id,
      });
      return instalment;
    } catch (error) {
      logger.error('Failed to create instalment', error);
      throw error;
    }
  }

  static async getInstalment(instalmentId: string): Promise<Instalment> {
    try {
      const instalment = instalmentDatabase.get(instalmentId);
      if (!instalment) {
        throw new NotFoundError(`Instalment ${instalmentId}`);
      }
      return instalment;
    } catch (error) {
      logger.error('Failed to get instalment', error);
      throw error;
    }
  }

  static async getUserInstalments(userId: string): Promise<Instalment[]> {
    try {
      const { PaymentService } = await import(
        '@/domains/payments/paymentService'
      );
      const orders = await PaymentService.getUserOrders(userId);
      const allInstalments = orders.flatMap((order) => order.instalments);
      return allInstalments.sort(
        (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
      );
    } catch (error) {
      logger.error('Failed to get user instalments', error);
      throw error;
    }
  }

  static async getUpcomingInstalments(userId: string): Promise<Instalment[]> {
    try {
      const instalments = await this.getUserInstalments(userId);
      const now = new Date();
      return instalments.filter(
        (i) => i.status === 'pending' && !isAfter(now, i.dueDate)
      );
    } catch (error) {
      logger.error('Failed to get upcoming instalments', error);
      throw error;
    }
  }

  static async getOverdueInstalments(userId: string): Promise<Instalment[]> {
    try {
      const instalments = await this.getUserInstalments(userId);
      const now = new Date();
      return instalments.filter(
        (i) => i.status === 'pending' && isAfter(now, i.dueDate)
      );
    } catch (error) {
      logger.error('Failed to get overdue instalments', error);
      throw error;
    }
  }

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
      const { PaymentProcessor } = await import(
        '@/modules/PaymentProcessor/processPayment'
      );
      const paymentResult = await PaymentProcessor.processPayment({
        orderId: instalment.orderId,
        amount: totalAmount,
        paymentMethod: 'debit_order',
        customerId: userId,
        merchantId: '', // Would need to get from order
      });

      if (!paymentResult.success) {
        throw new AppError(
          paymentResult.message || 'Repayment failed',
          'PAYMENT_FAILED',
          400
        );
      }

      // Update instalment
      const updatedInstalment: Instalment = {
        ...instalment,
        status: 'paid',
        paidAt: now,
        lateFee,
        paymentId: paymentResult.transactionId,
      };
      instalmentDatabase.set(instalmentId, updatedInstalment);

      // Create transaction
      const transaction: Transaction = {
        id: paymentResult.transactionId || `repay_${Date.now()}`,
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
      repaymentTransactionDatabase.set(transaction.id, transaction);

      // Update credit
      const { CreditService } = await import('@/domains/credit/creditService');
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
        (sum, i) => sum + i.amount + i.lateFee,
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
      throw error;
    }
  }

  static async sendPaymentReminders(): Promise<void> {
    try {
      const instalments = Array.from(instalmentDatabase.values());
      const now = new Date();

      for (const instalment of instalments) {
        if (instalment.status !== 'pending') continue;

        const daysUntilDue = differenceInDays(instalment.dueDate, now);

        // Send reminder 2 days before due
        if (daysUntilDue === 2 && !instalment.reminderSent) {
          // In production, send SMS/push notification
          logger.info(`Payment reminder sent for instalment ${instalment.id}`);

          const updated = {
            ...instalment,
            reminderSent: true,
            reminderCount: instalment.reminderCount + 1,
            lastReminderSent: now,
          };
          instalmentDatabase.set(instalment.id, updated);
        }
      }
    } catch (error) {
      logger.error('Failed to send payment reminders', error);
    }
  }
}
