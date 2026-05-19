// hooks/useOfflineSync.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { syncEngine } from '@/modules/OfflineSync/syncEngine';
import { useOnlineStatus } from './useOnlineStatus';

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await syncEngine.getPendingCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Failed to get pending count:', error);
      setPendingCount(0);
    }
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

  // Initialize - refresh pending count when component mounts
  useEffect(() => {
    const init = async () => {
      await refreshPendingCount();
      setIsInitialized(true);
    };
    init();
  }, [refreshPendingCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && isInitialized && pendingCount > 0 && !isSyncing) {
      performSync();
    }
  }, [isOnline, isInitialized, pendingCount, isSyncing, performSync]);

  return {
    pendingCount,
    isSyncing,
    performSync,
    refreshPendingCount,
    isInitialized,
  };
}