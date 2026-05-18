// domains/user/history/transactionHistory.ts
import { supabase } from '@/services/supabase/client';
import { Transaction } from '@/types/transaction';
import { logger } from '@/lib/logger';

export class TransactionHistoryService {
  /**
   * Get transactions for a user with pagination and filters
   */
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
      let query = supabase
        .from('transactions')
        .select('*, merchants(name)', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.type) {
        query = query.eq('type', options.type);
      }

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }

      if (options?.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }

      if (options?.limit) {
        query = query.range(
          options.offset || 0,
          (options.offset || 0) + options.limit - 1
        );
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to get transactions:', error);
        return { transactions: [], total: 0 };
      }

      const transactions: Transaction[] = (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        orderId: item.id,
        type: item.type,
        amount: item.amount,
        fee: item.fee || 0,
        total: item.total || item.amount,
        status: item.status,
        reference: item.reference || `txn_${item.id.substring(0, 8)}`,
        metadata: item.metadata || {},
        createdAt: new Date(item.created_at),
        completedAt: item.completed_at ? new Date(item.completed_at) : null,
      }));

      return {
        transactions,
        total: count || 0,
      };
    } catch (error) {
      logger.error('Failed to get transactions', error);
      return { transactions: [], total: 0 };
    }
  }

  /**
   * Get a single transaction by ID
   */
  static async getTransactionById(
    transactionId: string
  ): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, merchants(name)')
        .eq('id', transactionId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        orderId: data.id,
        type: data.type,
        amount: data.amount,
        fee: data.fee || 0,
        total: data.total || data.amount,
        status: data.status,
        reference: data.reference || `txn_${data.id.substring(0, 8)}`,
        metadata: data.metadata || {},
        createdAt: new Date(data.created_at),
        completedAt: data.completed_at ? new Date(data.completed_at) : null,
      };
    } catch (error) {
      logger.error('Failed to get transaction by ID', error);
      return null;
    }
  }

  /**
   * Get transaction summary for a user
   */
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
      return {
        totalSpent: 0,
        totalRepaid: 0,
        totalFees: 0,
        averageTransaction: 0,
        transactionCount: 0,
      };
    }
  }

  /**
   * Get transaction by month (for charts)
   */
  static async getTransactionsByMonth(
    userId: string,
    year: number,
    month: number
  ): Promise<Transaction[]> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const { transactions } = await this.getTransactions(userId, {
        startDate,
        endDate,
      });

      return transactions;
    } catch (error) {
      logger.error('Failed to get transactions by month', error);
      return [];
    }
  }

  /**
   * Get spending by category (from transaction metadata or merchant category)
   */
  static async getSpendingByCategory(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ category: string; amount: number }[]> {
    try {
      const { transactions } = await this.getTransactions(userId, {
        startDate,
        endDate,
      });

      const purchases = transactions.filter(
        (tx) => tx.type === 'purchase' && tx.status === 'completed'
      );

      const categoryMap = new Map<string, number>();

      for (const purchase of purchases) {
        const category = (purchase.metadata?.category as string) || 'Other';
        const current = categoryMap.get(category) || 0;
        categoryMap.set(category, current + purchase.amount);
      }

      return Array.from(categoryMap.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
    } catch (error) {
      logger.error('Failed to get spending by category', error);
      return [];
    }
  }
}