// hooks/useOffline.ts
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { offlineService } from '@/domains/offline/offlineService';
import { syncStatusManager } from '@/domains/offline/syncStatus';
import { useAuth } from './useAuth';

export function useOffline() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      const status = await syncStatusManager.getCurrentStatus();
      setIsOnline(status.isOnline);
      setPendingCount(status.pendingCount);
      setIsSyncing(status.isSyncing);
    };

    loadStatus();

    const unsubscribe = syncStatusManager.onStatusChange((status) => {
      setIsOnline(status.isOnline);
      setPendingCount(status.pendingCount);
      setIsSyncing(status.isSyncing);
    });

    return unsubscribe;
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    const result = await syncStatusManager.performSync();

    if (result.success) {
      toast.success(`Synced ${result.syncedCount} items`);
    } else if (result.syncedCount > 0) {
      toast.warning(
        `Partially synced: ${result.syncedCount} succeeded, ${result.failedCount} failed`
      );
    } else {
      toast.error('Sync failed');
    }

    return result;
  }, [isOnline]);

  const queueOperation = useCallback(
    async <T>(
      endpoint: string,
      operation: 'create' | 'update' | 'delete',
      data: Record<string, unknown>,
      cacheKey?: string
    ): Promise<T> => {
      if (!user) throw new Error('User not authenticated');

      return offlineService.executeWithOfflineSupport<T>(
        endpoint,
        operation,
        data,
        user.id,
        { cacheKey }
      );
    },
    [user]
  );

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncNow,
    queueOperation,
    hasPending: pendingCount > 0,
  };
}