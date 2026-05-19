// modules/OfflineSync/syncEngine.ts
import { offlineQueue, QueuedOperation } from './queue';
import { supabase } from '@/services/supabase/client';
import { logger } from '@/lib/logger';

export class SyncEngine {
  private static instance: SyncEngine;
  private isSyncing = false;

  static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  async sync(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
      const pendingOperations = await offlineQueue.getPending();

      for (const operation of pendingOperations) {
        await offlineQueue.updateStatus(operation.id, 'processing');
        
        try {
          const success = await this.executeOperation(operation);
          
          if (success) {
            await offlineQueue.remove(operation.id);
            synced++;
            logger.info(`Synced operation: ${operation.id}`);
          } else {
            const newRetryCount = operation.retryCount + 1;
            if (newRetryCount >= operation.maxRetries) {
              await offlineQueue.updateStatus(operation.id, 'failed', newRetryCount);
              failed++;
            } else {
              await offlineQueue.updateStatus(operation.id, 'pending', newRetryCount);
            }
          }
        } catch (error) {
          const newRetryCount = operation.retryCount + 1;
          if (newRetryCount >= operation.maxRetries) {
            await offlineQueue.updateStatus(operation.id, 'failed', newRetryCount);
            failed++;
          } else {
            await offlineQueue.updateStatus(operation.id, 'pending', newRetryCount);
          }
          logger.error(`Sync failed for ${operation.id}`, error);
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { synced, failed };
  }

  private async executeOperation(operation: QueuedOperation): Promise<boolean> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };

    const url = `/api${operation.endpoint}`;
    const options: RequestInit = {
      method: operation.type === 'create' ? 'POST' : operation.type === 'update' ? 'PUT' : 'DELETE',
      headers,
      body: JSON.stringify(operation.data),
    };

    try {
      const response = await fetch(url, options);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async getPendingCount(): Promise<number> {
    return offlineQueue.getCount();
  }
}

export const syncEngine = SyncEngine.getInstance();