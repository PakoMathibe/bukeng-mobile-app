// hooks/useOfflineSync.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { syncEngine } from '@/modules/OfflineSync/syncEngine';
import { offlineQueue } from '@/modules/OfflineSync/queue';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';

export function useOfflineSync() {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    const count = await syncEngine.getPendingCount();
    setPendingCount(count);
  }, []);

  const performSync = useCallback(async () => {
    if (!isOnline || isSyncing) return { synced: 0, failed: 0 };

    setIsSyncing(true);
    try {
      const result = await syncEngine.sync();
      await refreshPendingCount();
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, refreshPendingCount]);

  // Initial load - refresh pending count
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      performSync();
    }
  }, [isOnline, pendingCount, isSyncing, performSync]);

  return {
    pendingCount,
    isSyncing,
    performSync,
    refreshPendingCount,
  };
}