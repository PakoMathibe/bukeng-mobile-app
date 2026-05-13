// modules/OfflineSync/syncEngine.ts
import { OfflineQueue, QueuedTransaction } from './queue';
import { supabase } from '@/services/supabase/client';
import { logger } from '@/lib/logger';

export class SyncEngine {
  private isSyncing = false;

  async sync(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
      const pendingTransactions = await OfflineQueue.getAllPending();

      for (const transaction of pendingTransactions) {
        await OfflineQueue.updateStatus(transaction.id!, 'processing');

        try {
          let success = false;

          switch (transaction.type) {
            case 'payment':
              success = await this.syncPayment(transaction);
              break;
            case 'repayment':
              success = await this.syncRepayment(transaction);
              break;
            case 'kyc':
              success = await this.syncKYC(transaction);
              break;
          }

          if (success) {
            await OfflineQueue.remove(transaction.id!);
            synced++;
          } else {
            const newRetryCount = (transaction.retryCount || 0) + 1;
            if (newRetryCount >= 5) {
              await OfflineQueue.updateStatus(
                transaction.id!,
                'failed',
                newRetryCount
              );
              failed++;
            } else {
              await OfflineQueue.updateStatus(
                transaction.id!,
                'pending',
                newRetryCount
              );
            }
          }
        } catch (error) {
          logger.error(`Sync failed for transaction ${transaction.id}`, error);
          const newRetryCount = (transaction.retryCount || 0) + 1;
          if (newRetryCount >= 5) {
            await OfflineQueue.updateStatus(
              transaction.id!,
              'failed',
              newRetryCount
            );
            failed++;
          } else {
            await OfflineQueue.updateStatus(
              transaction.id!,
              'pending',
              newRetryCount
            );
          }
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { synced, failed };
  }

  private async syncPayment(transaction: QueuedTransaction): Promise<boolean> {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        user_id: transaction.userId,
        order_id: transaction.data.orderId,
        amount: transaction.data.amount,
        status: 'pending',
        payment_method: transaction.data.paymentMethod,
      })
      .select()
      .single();

    if (error) throw error;
    return true;
  }

  private async syncRepayment(
    transaction: QueuedTransaction
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('repayments')
      .insert({
        user_id: transaction.userId,
        order_id: transaction.data.orderId,
        instalment_id: transaction.data.instalmentId,
        amount: transaction.data.amount,
        late_fee: transaction.data.lateFee || 0,
        status: 'pending',
        due_date: transaction.data.dueDate,
      })
      .select()
      .single();

    if (error) throw error;
    return true;
  }

  private async syncKYC(transaction: QueuedTransaction): Promise<boolean> {
    const { data, error } = await supabase
      .from('kyc_records')
      .insert({
        user_id: transaction.userId,
        type: transaction.data.documentType,
        file_url: transaction.data.fileUrl,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return true;
  }
}

export const syncEngine = new SyncEngine();
