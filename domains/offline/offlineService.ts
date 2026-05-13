// domains/offline/offlineService.ts
import { openDB, IDBPDatabase } from 'idb';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';

export interface OfflineQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  endpoint: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'normal' | 'low';
  userId: string;
  requiresAuth: boolean;
}

export interface SyncMetadata {
  lastSyncAt: Date | null;
  lastSyncStatus: 'success' | 'failed' | 'partial';
  lastError: string | null;
  totalSynced: number;
  totalFailed: number;
  syncInProgress: boolean;
}

export interface OfflineCache {
  key: string;
  data: unknown;
  timestamp: number;
  expiresAt: number;
  userId: string;
}

export interface OfflineState {
  isOnline: boolean;
  lastOnlineAt: Date | null;
  pendingSyncCount: number;
}

class OfflineService {
  private static instance: OfflineService;
  private db: IDBPDatabase | null = null;
  private readonly DB_NAME = 'bukeng-offline';
  private readonly DB_VERSION = 2;
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY = 1000;
  private isSyncing = false;
  private onlineStatusListeners: ((isOnline: boolean) => void)[] = [];

  private constructor() {
    this.init();
    this.setupOnlineStatusDetection();
  }

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  private async init(): Promise<void> {
    try {
      this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // Create queues store
          if (!db.objectStoreNames.contains('queues')) {
            const queueStore = db.createObjectStore('queues', {
              keyPath: 'id',
            });
            queueStore.createIndex('by_timestamp', 'timestamp');
            queueStore.createIndex('by_retry_count', 'retryCount');
            queueStore.createIndex('by_priority', 'priority');
          }

          // Create cache store
          if (!db.objectStoreNames.contains('cache')) {
            const cacheStore = db.createObjectStore('cache', {
              keyPath: 'key',
            });
            cacheStore.createIndex('by_expiry', 'expiresAt');
            cacheStore.createIndex('by_user', 'userId');
          }

          // Create sync metadata store
          if (!db.objectStoreNames.contains('sync_metadata')) {
            db.createObjectStore('sync_metadata', { keyPath: 'key' });
          }

          // Create offline state store
          if (!db.objectStoreNames.contains('offline_state')) {
            db.createObjectStore('offline_state', { keyPath: 'key' });
          }
        },
      });

      await this.initializeOfflineState();
      logger.info('Offline service initialized');
    } catch (error) {
      logger.error('Failed to initialize offline service', error);
    }
  }

  private async initializeOfflineState(): Promise<void> {
    const state = await this.getOfflineState();
    if (!state) {
      await this.saveOfflineState({
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        lastOnlineAt: null,
        pendingSyncCount: 0,
      });
    }
  }

  private setupOnlineStatusDetection(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', async () => {
      logger.info('Device back online');
      await this.updateOnlineStatus(true);
      this.notifyOnlineStatusListeners(true);
      await this.syncPendingOperations();
    });

    window.addEventListener('offline', async () => {
      logger.info('Device offline');
      await this.updateOnlineStatus(false);
      this.notifyOnlineStatusListeners(false);
    });
  }

  private async updateOnlineStatus(isOnline: boolean): Promise<void> {
    const state = await this.getOfflineState();
    if (state) {
      state.isOnline = isOnline;
      if (isOnline) {
        state.lastOnlineAt = new Date();
      }
      await this.saveOfflineState(state);
    }
  }

  private notifyOnlineStatusListeners(isOnline: boolean): void {
    this.onlineStatusListeners.forEach((listener) => listener(isOnline));
  }

  onOnlineStatusChange(listener: (isOnline: boolean) => void): () => void {
    this.onlineStatusListeners.push(listener);
    return () => {
      const index = this.onlineStatusListeners.indexOf(listener);
      if (index > -1) {
        this.onlineStatusListeners.splice(index, 1);
      }
    };
  }

  async addToQueue(
    operation: OfflineQueueItem['operation'],
    endpoint: string,
    data: Record<string, unknown>,
    userId: string,
    priority: OfflineQueueItem['priority'] = 'normal',
    requiresAuth: boolean = true
  ): Promise<string> {
    const id = `${operation}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const queueItem: OfflineQueueItem = {
      id,
      operation,
      endpoint,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.MAX_RETRIES,
      priority,
      userId,
      requiresAuth,
    };

    await this.db!.add('queues', queueItem);
    await this.updatePendingSyncCount();

    logger.debug(`Added to offline queue: ${id}`, { operation, endpoint });

    return id;
  }

  async getQueue(): Promise<OfflineQueueItem[]> {
    const queue = await this.db!.getAll('queues');
    return queue.sort((a, b) => {
      // Sort by priority first, then by timestamp
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.timestamp - b.timestamp;
    });
  }

  async getQueueItem(id: string): Promise<OfflineQueueItem | undefined> {
    return await this.db!.get('queues', id);
  }

  async removeFromQueue(id: string): Promise<void> {
    await this.db!.delete('queues', id);
    await this.updatePendingSyncCount();
  }

  async updateRetryCount(id: string): Promise<void> {
    const item = await this.getQueueItem(id);
    if (item) {
      item.retryCount++;
      await this.db!.put('queues', item);
    }
  }

  async clearQueue(): Promise<void> {
    const queue = await this.getQueue();
    for (const item of queue) {
      await this.removeFromQueue(item.id);
    }
    await this.updatePendingSyncCount();
    logger.info('Offline queue cleared');
  }

  async syncPendingOperations(): Promise<{
    syncedCount: number;
    failedCount: number;
    errors: string[];
  }> {
    if (this.isSyncing) {
      logger.debug('Sync already in progress');
      return {
        syncedCount: 0,
        failedCount: 0,
        errors: ['Sync already in progress'],
      };
    }

    const isOnline = await this.isOnline();
    if (!isOnline) {
      logger.debug('Device is offline, skipping sync');
      return { syncedCount: 0, failedCount: 0, errors: ['Device is offline'] };
    }

    this.isSyncing = true;
    await this.updateSyncStatus({ syncInProgress: true });

    let syncedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      const queue = await this.getQueue();

      for (const item of queue) {
        if (item.retryCount >= item.maxRetries) {
          await this.removeFromQueue(item.id);
          failedCount++;
          errors.push(`Max retries exceeded for ${item.id}`);
          continue;
        }

        try {
          const response = await this.executeSyncOperation(item);

          if (response.success) {
            await this.removeFromQueue(item.id);
            syncedCount++;
            logger.debug(`Synced operation: ${item.id}`);
          } else {
            await this.updateRetryCount(item.id);
            failedCount++;
            errors.push(`Failed to sync ${item.id}: ${response.error}`);
          }
        } catch (error) {
          await this.updateRetryCount(item.id);
          failedCount++;
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to sync ${item.id}: ${errorMessage}`);
          logger.error(`Sync failed for ${item.id}`, error);
        }

        // Small delay between operations to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      await this.updateSyncMetadata({
        lastSyncAt: new Date(),
        lastSyncStatus:
          failedCount === 0
            ? 'success'
            : failedCount > 0 && syncedCount > 0
            ? 'partial'
            : 'failed',
        totalSynced: syncedCount,
        totalFailed: failedCount,
        lastError: errors.length > 0 ? errors[0] : null,
      });
    } catch (error) {
      logger.error('Sync failed', error);
      await this.updateSyncMetadata({
        lastSyncStatus: 'failed',
        lastError: error instanceof Error ? error.message : 'Sync failed',
      });
    } finally {
      this.isSyncing = false;
      await this.updateSyncStatus({ syncInProgress: false });
      await this.updatePendingSyncCount();
    }

    return { syncedCount, failedCount, errors };
  }

  private async executeSyncOperation(
    item: OfflineQueueItem
  ): Promise<{ success: boolean; error?: string }> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (item.requiresAuth) {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('auth_token')
          : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const url = `/api${item.endpoint}`;
    const options: RequestInit = {
      method:
        item.operation === 'create'
          ? 'POST'
          : item.operation === 'update'
          ? 'PUT'
          : 'DELETE',
      headers,
      body: JSON.stringify(item.data),
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  }

  async cacheData(
    key: string,
    data: unknown,
    userId: string,
    ttlSeconds: number = 300
  ): Promise<void> {
    const cacheItem: OfflineCache = {
      key: `${userId}:${key}`,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
      userId,
    };
    await this.db!.put('cache', cacheItem);
    logger.debug(`Cached data: ${key}`);
  }

  async getCachedData<T>(key: string, userId: string): Promise<T | null> {
    const cacheKey = `${userId}:${key}`;
    const item = await this.db!.get('cache', cacheKey);

    if (!item) return null;

    if (item.expiresAt < Date.now()) {
      await this.db!.delete('cache', cacheKey);
      return null;
    }

    return item.data as T;
  }

  async invalidateCache(key: string, userId: string): Promise<void> {
    const cacheKey = `${userId}:${key}`;
    await this.db!.delete('cache', cacheKey);
  }

  async clearExpiredCache(): Promise<void> {
    const allCache = await this.db!.getAll('cache');
    const now = Date.now();

    for (const item of allCache) {
      if (item.expiresAt < now) {
        await this.db!.delete('cache', item.key);
      }
    }
  }

  private async updateSyncMetadata(
    metadata: Partial<SyncMetadata>
  ): Promise<void> {
    const existing = await this.getSyncMetadata();
    const updated: SyncMetadata = {
      lastSyncAt: existing?.lastSyncAt || null,
      lastSyncStatus: existing?.lastSyncStatus || 'success',
      lastError: existing?.lastError || null,
      totalSynced: existing?.totalSynced || 0,
      totalFailed: existing?.totalFailed || 0,
      syncInProgress: existing?.syncInProgress || false,
      ...metadata,
    };
    await this.db!.put('sync_metadata', { key: 'sync_metadata', ...updated });
  }

  async getSyncMetadata(): Promise<SyncMetadata | null> {
    const record = await this.db!.get('sync_metadata', 'sync_metadata');
    return record || null;
  }

  private async updateSyncStatus(status: {
    syncInProgress: boolean;
  }): Promise<void> {
    const metadata = await this.getSyncMetadata();
    if (metadata) {
      metadata.syncInProgress = status.syncInProgress;
      await this.db!.put('sync_metadata', {
        key: 'sync_metadata',
        ...metadata,
      });
    }
  }

  private async saveOfflineState(state: OfflineState): Promise<void> {
    await this.db!.put('offline_state', { key: 'offline_state', ...state });
  }

  async getOfflineState(): Promise<OfflineState | null> {
    const record = await this.db!.get('offline_state', 'offline_state');
    return record || null;
  }

  async updatePendingSyncCount(): Promise<void> {
    const queue = await this.getQueue();
    const pendingCount = queue.length;

    const state = await this.getOfflineState();
    if (state) {
      state.pendingSyncCount = pendingCount;
      await this.saveOfflineState(state);
    }
  }

  async isOnline(): Promise<boolean> {
    const state = await this.getOfflineState();
    return (
      state?.isOnline ??
      (typeof navigator !== 'undefined' ? navigator.onLine : true)
    );
  }

  async getPendingCount(): Promise<number> {
    const state = await this.getOfflineState();
    return state?.pendingSyncCount || 0;
  }

  async shouldUseCache(endpoint: string): Promise<boolean> {
    const isOnline = await this.isOnline();
    return !isOnline;
  }

  async executeWithOfflineSupport<T>(
    endpoint: string,
    operation: OfflineQueueItem['operation'],
    data: Record<string, unknown>,
    userId: string,
    options?: {
      priority?: OfflineQueueItem['priority'];
      cacheKey?: string;
      cacheTTL?: number;
    }
  ): Promise<T> {
    const isOnline = await this.isOnline();

    if (isOnline) {
      try {
        // Try to execute online
        const response = await this.executeSyncOperation({
          id: '',
          operation,
          endpoint,
          data,
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: this.MAX_RETRIES,
          priority: options?.priority || 'normal',
          userId,
          requiresAuth: true,
        });

        if (response.success) {
          // Cache the response for offline use
          if (options?.cacheKey) {
            await this.cacheData(
              options.cacheKey,
              response,
              userId,
              options.cacheTTL || 300
            );
          }
          return response as T;
        }

        throw new Error(response.error || 'Operation failed');
      } catch (error) {
        // If online execution fails, queue it
        await this.addToQueue(
          operation,
          endpoint,
          data,
          userId,
          options?.priority
        );
        throw error;
      }
    } else {
      // Offline: queue and try to use cache if available
      await this.addToQueue(
        operation,
        endpoint,
        data,
        userId,
        options?.priority
      );

      if (options?.cacheKey) {
        const cached = await this.getCachedData<T>(options.cacheKey, userId);
        if (cached) {
          return cached;
        }
      }

      throw new AppError(
        'You are offline. This operation will complete when you reconnect.',
        'OFFLINE_OPERATION',
        0
      );
    }
  }
}

export const offlineService = OfflineService.getInstance();
