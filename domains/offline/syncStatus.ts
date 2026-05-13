// domains/offline/syncStatus.ts
import { offlineService } from './offlineService';
import { logger } from '@/lib/logger';

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: 'success' | 'failed' | 'partial' | null;
  lastError: string | null;
  syncProgress: number;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
  duration: number;
}

export class SyncStatusManager {
  private static instance: SyncStatusManager;
  private listeners: ((status: SyncStatus) => void)[] = [];

  private constructor() {}

  static getInstance(): SyncStatusManager {
    if (!SyncStatusManager.instance) {
      SyncStatusManager.instance = new SyncStatusManager();
    }
    return SyncStatusManager.instance;
  }

  async getCurrentStatus(): Promise<SyncStatus> {
    const [isOnline, pendingCount, metadata, state] = await Promise.all([
      offlineService.isOnline(),
      offlineService.getPendingCount(),
      offlineService.getSyncMetadata(),
      offlineService.getOfflineState(),
    ]);

    return {
      isOnline,
      pendingCount,
      isSyncing: metadata?.syncInProgress || false,
      lastSyncAt: metadata?.lastSyncAt || null,
      lastSyncStatus: metadata?.lastSyncStatus || null,
      lastError: metadata?.lastError || null,
      syncProgress:
        state?.pendingSyncCount && state.pendingSyncCount > 0
          ? ((metadata?.totalSynced || 0) /
              ((metadata?.totalSynced || 0) +
                (metadata?.totalFailed || 0) +
                (state.pendingSyncCount || 0))) *
            100
          : 100,
    };
  }

  async performSync(): Promise<SyncResult> {
    const startTime = Date.now();
    const result = await offlineService.syncPendingOperations();
    const duration = Date.now() - startTime;

    await this.notifyListeners();

    return {
      success: result.failedCount === 0,
      syncedCount: result.syncedCount,
      failedCount: result.failedCount,
      errors: result.errors,
      duration,
    };
  }

  async retryFailed(): Promise<SyncResult> {
    // Reset retry counts for failed items and sync again
    const queue = await offlineService.getQueue();
    for (const item of queue) {
      if (item.retryCount >= item.maxRetries) {
        // Reset retry count
        item.retryCount = 0;
        await offlineService.updateRetryCount(item.id);
      }
    }
    return this.performSync();
  }

  async clearPending(): Promise<void> {
    await offlineService.clearQueue();
    await this.notifyListeners();
    logger.info('Pending operations cleared');
  }

  onStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private async notifyListeners(): Promise<void> {
    const status = await this.getCurrentStatus();
    this.listeners.forEach((listener) => listener(status));
  }

  formatSyncStatus(status: SyncStatus): string {
    if (!status.isOnline) {
      return 'Offline - Changes will sync when you reconnect';
    }

    if (status.isSyncing) {
      return `Syncing... ${status.syncProgress.toFixed(0)}%`;
    }

    if (status.pendingCount > 0) {
      return `${status.pendingCount} item(s) pending sync`;
    }

    if (status.lastSyncAt) {
      const timeAgo = Math.floor(
        (Date.now() - status.lastSyncAt.getTime()) / 1000 / 60
      );
      return `Last synced ${timeAgo} minute${timeAgo !== 1 ? 's' : ''} ago`;
    }

    return 'Ready';
  }

  getSyncBadgeVariant(
    status: SyncStatus
  ): 'default' | 'success' | 'warning' | 'error' {
    if (!status.isOnline) return 'error';
    if (status.isSyncing) return 'warning';
    if (status.pendingCount > 0) return 'warning';
    if (status.lastSyncStatus === 'failed') return 'error';
    return 'success';
  }
}

export const syncStatusManager = SyncStatusManager.getInstance();
export interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  timestamp: Date;
  retryCount: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

export interface SyncQueueProps {
  items: SyncQueueItem[];
  onRetry: (id: string) => void;
  onClear: () => void;
  onSyncAll: () => void;
  isSyncing: boolean;
}

export interface SyncIndicatorProps {
  variant: 'default' | 'success' | 'warning' | 'error';
  text: string;
  onClick?: () => void;
  showIcon?: boolean;
  className?: string;
}
