// domains/user/history/transactionHistory.ts
import { Transaction } from '@/types/transaction';
import { AppError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface TransactionRecord {
  id: string;
  userId: string;
  transaction: Transaction;
  createdAt: Date;
}

// Mock database
const transactionDatabase: Map<string, TransactionRecord[]> = new Map();

export class TransactionHistoryService {
  static async getTransactions(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ transactions: Transaction[]; total: number }> {
    try {
      let records = transactionDatabase.get(userId) || [];

      // Apply filters
      let filtered = records.map((r) => r.transaction);

      if (options?.type) {
        filtered = filtered.filter((tx) => tx.type === options.type);
      }

      if (options?.startDate) {
        filtered = filtered.filter((tx) => tx.createdAt >= options.startDate!);
      }

      if (options?.endDate) {
        filtered = filtered.filter((tx) => tx.createdAt <= options.endDate!);
      }

      const total = filtered.length;

      if (options?.offset) {
        filtered = filtered.slice(options.offset);
      }

      if (options?.limit) {
        filtered = filtered.slice(0, options.limit);
      }

      return {
        transactions: filtered,
        total,
      };
    } catch (error) {
      logger.error('Failed to get transactions', error);
      throw error;
    }
  }

  static async getTransactionById(
    transactionId: string
  ): Promise<Transaction | null> {
    try {
      for (const records of transactionDatabase.values()) {
        const record = records.find((r) => r.transaction.id === transactionId);
        if (record) {
          return record.transaction;
        }
      }
      return null;
    } catch (error) {
      logger.error('Failed to get transaction', error);
      throw error;
    }
  }

  static async addTransaction(
    userId: string,
    transaction: Transaction
  ): Promise<void> {
    try {
      const records = transactionDatabase.get(userId) || [];
      records.push({
        id: transaction.id,
        userId,
        transaction,
        createdAt: new Date(),
      });
      transactionDatabase.set(userId, records);

      logger.info(`Transaction added for user ${userId}`, {
        transactionId: transaction.id,
      });
    } catch (error) {
      logger.error('Failed to add transaction', error);
      throw error;
    }
  }

  static async updateTransactionStatus(
    transactionId: string,
    status: Transaction['status']
  ): Promise<void> {
    try {
      for (const [userId, records] of transactionDatabase) {
        const recordIndex = records.findIndex(
          (r) => r.transaction.id === transactionId
        );

        if (recordIndex !== -1) {
          records[recordIndex]!.transaction.status = status;
          transactionDatabase.set(userId, records);
          break;
        }
      }
    } catch (error) {
      logger.error('Failed to update transaction status', error);
      throw error;
    }
  }

  static async getTransactionSummary(userId: string): Promise<{
    totalSpent: number;
    totalRepaid: number;
    totalFees: number;
    averageTransaction: number;
    transactionCount: number;
  }> {
    try {
      const { transactions } = await this.getTransactions(userId);

      const totalSpent = transactions
        .filter((tx) => tx.type === 'purchase' && tx.status === 'completed')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const totalRepaid = transactions
        .filter((tx) => tx.type === 'repayment' && tx.status === 'completed')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const totalFees = transactions
        .filter((tx) => tx.type === 'late_fee' && tx.status === 'completed')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const completedTransactions = transactions.filter(
        (tx) => tx.status === 'completed'
      );
      const averageTransaction =
        completedTransactions.length > 0
          ? completedTransactions.reduce((sum, tx) => sum + tx.amount, 0) /
            completedTransactions.length
          : 0;

      return {
        totalSpent,
        totalRepaid,
        totalFees,
        averageTransaction,
        transactionCount: transactions.length,
      };
    } catch (error) {
      logger.error('Failed to get transaction summary', error);
      throw error;
    }
  }
}
