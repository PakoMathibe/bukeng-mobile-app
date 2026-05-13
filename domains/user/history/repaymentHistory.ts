// domains/user/history/repaymentHistory.ts
import { Instalment, Order } from '@/types/transaction';
import { AppError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { isAfter, differenceInDays } from 'date-fns';

interface RepaymentRecord {
  userId: string;
  instalments: Instalment[];
  orders: Order[];
}

const repaymentDatabase: Map<string, RepaymentRecord> = new Map();

export class RepaymentHistoryService {
  static async getRepaymentHistory(userId: string): Promise<Instalment[]> {
    try {
      const record = repaymentDatabase.get(userId);
      return record?.instalments || [];
    } catch (error) {
      logger.error('Failed to get repayment history', error);
      throw error;
    }
  }

  static async getUpcomingRepayments(userId: string): Promise<Instalment[]> {
    try {
      const record = repaymentDatabase.get(userId);
      if (!record) return [];

      const now = new Date();
      return record.instalments.filter(
        (i) => i.status === 'pending' && !isAfter(now, i.dueDate)
      );
    } catch (error) {
      logger.error('Failed to get upcoming repayments', error);
      throw error;
    }
  }

  static async getOverdueRepayments(userId: string): Promise<Instalment[]> {
    try {
      const record = repaymentDatabase.get(userId);
      if (!record) return [];

      const now = new Date();
      return record.instalments.filter(
        (i) => i.status === 'pending' && isAfter(now, i.dueDate)
      );
    } catch (error) {
      logger.error('Failed to get overdue repayments', error);
      throw error;
    }
  }

  static async addInstalment(
    userId: string,
    instalment: Instalment
  ): Promise<void> {
    try {
      let record = repaymentDatabase.get(userId);

      if (!record) {
        record = { userId, instalments: [], orders: [] };
      }

      record.instalments.push(instalment);
      repaymentDatabase.set(userId, record);

      logger.info(`Instalment added for user ${userId}`, {
        instalmentId: instalment.id,
      });
    } catch (error) {
      logger.error('Failed to add instalment', error);
      throw error;
    }
  }

  static async updateInstalment(
    instalmentId: string,
    updates: Partial<Instalment>
  ): Promise<Instalment> {
    try {
      for (const [userId, record] of repaymentDatabase) {
        const instalmentIndex = record.instalments.findIndex(
          (i) => i.id === instalmentId
        );

        if (instalmentIndex !== -1) {
          const updatedInstalment: Instalment = {
            ...record.instalments[instalmentIndex]!,
            ...updates,
          };

          record.instalments[instalmentIndex] = updatedInstalment;
          repaymentDatabase.set(userId, record);

          return updatedInstalment;
        }
      }

      throw new NotFoundError(`Instalment ${instalmentId}`);
    } catch (error) {
      logger.error('Failed to update instalment', error);
      throw error;
    }
  }

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
        (sum, i) => sum + i.amount + i.lateFee,
        0
      );
      const totalPaid = instalments
        .filter((i) => i.status === 'paid')
        .reduce((sum, i) => sum + i.amount + i.lateFee, 0);

      const overdueInstalments = await this.getOverdueRepayments(userId);
      const overdueAmount = overdueInstalments.reduce(
        (sum, i) => sum + i.amount + i.lateFee,
        0
      );

      const totalCompleted = instalments.filter(
        (i) => i.status === 'paid'
      ).length;
      const onTimeRate =
        totalCompleted > 0
          ? instalments.filter(
              (i) => i.status === 'paid' && i.paidAt && i.paidAt <= i.dueDate
            ).length / totalCompleted
          : 1;

      const upcoming = await this.getUpcomingRepayments(userId);
      const nextUpcoming = upcoming.sort(
        (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
      )[0];

      return {
        totalDue,
        totalPaid,
        overdueAmount,
        onTimeRate,
        nextDueDate: nextUpcoming?.dueDate || null,
        nextDueAmount: nextUpcoming?.amount || 0,
      };
    } catch (error) {
      logger.error('Failed to get repayment stats', error);
      throw error;
    }
  }

  static calculateLateFee(dueDate: Date, paidAt: Date | null): number {
    if (!paidAt) return 0;
    if (paidAt <= dueDate) return 0;

    const daysLate = differenceInDays(paidAt, dueDate);
    const periodsLate = Math.floor(daysLate / 30);
    const fee = periodsLate * 35;
    return Math.min(fee, 100);
  }
}
