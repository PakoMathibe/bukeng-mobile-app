// store/offlineStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OperationType = 'create' | 'update' | 'delete';
export type OperationPriority = 'high' | 'normal' | 'low';

export interface QueuedOperation {
  id: string;
  type: OperationType;
  endpoint: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: OperationPriority;
  expiresAt: number | null;  // TTL for stale operations
  lastRetryAt: number | null;
}

export interface SyncMetadata {
  lastSyncAt: Date | null;
  lastSyncStatus: 'success' | 'failed' | 'partial';
  lastError: string | null;
  totalSynced: number;
  totalFailed: number;
  totalExpired: number;
}

interface OfflineState {
  isOnline: boolean;
  queue: QueuedOperation[];
  syncMetadata: SyncMetadata;
  isSyncing: boolean;

  setIsOnline: (isOnline: boolean) => void;
  addToQueue: (
    operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount' | 'lastRetryAt'>
  ) => string;
  removeFromQueue: (id: string) => void;
  updateRetryCount: (id: string) => void;
  clearQueue: () => void;
  setSyncing: (isSyncing: boolean) => void;
  setSyncMetadata: (metadata: Partial<SyncMetadata>) => void;
  getQueueLength: () => number;
  getQueuedOperations: (priority?: OperationPriority) => QueuedOperation[];
  getExpiredOperations: () => QueuedOperation[];
  cleanupExpiredOperations: () => void;
  reset: () => void;
}

const DEFAULT_MAX_RETRIES = 3;
const OPERATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      queue: [],
      syncMetadata: {
        lastSyncAt: null,
        lastSyncStatus: 'success',
        lastError: null,
        totalSynced: 0,
        totalFailed: 0,
        totalExpired: 0,
      },
      isSyncing: false,

      setIsOnline: (isOnline) => set({ isOnline }),

      addToQueue: (operation) => {
        const id = `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        // Clean up expired operations before adding new one
        get().cleanupExpiredOperations();
        
        const queuedOperation: QueuedOperation = {
          ...operation,
          id,
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: operation.maxRetries ?? DEFAULT_MAX_RETRIES,
          priority: operation.priority ?? 'normal',
          expiresAt: operation.expiresAt ?? Date.now() + OPERATION_TTL_MS,
          lastRetryAt: null,
        };

        set((state) => ({
          queue: [...state.queue, queuedOperation],
        }));

        return id;
      },

      removeFromQueue: (id) => {
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== id),
        }));
      },

      updateRetryCount: (id) => {
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id 
              ? { 
                  ...item, 
                  retryCount: item.retryCount + 1,
                  lastRetryAt: Date.now(),
                } 
              : item
          ),
        }));
        
        // Check if operation has exceeded max retries
        const operation = get().queue.find((item) => item.id === id);
        if (operation && operation.retryCount >= operation.maxRetries) {
          get().removeFromQueue(id);
          set((state) => ({
            syncMetadata: {
              ...state.syncMetadata,
              totalFailed: state.syncMetadata.totalFailed + 1,
            },
          }));
        }
      },

      clearQueue: () => {
        set({ queue: [] });
      },

      setSyncing: (isSyncing) => set({ isSyncing }),

      setSyncMetadata: (metadata) =>
        set((state) => ({
          syncMetadata: { ...state.syncMetadata, ...metadata },
        })),

      getQueueLength: () => {
        return get().queue.length;
      },

      getQueuedOperations: (priority) => {
        const queue = get().queue;
        if (priority) {
          return queue.filter((item) => item.priority === priority);
        }
        // Return sorted by priority (high first) then timestamp
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return [...queue].sort((a, b) => {
          if (a.priority !== b.priority) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          return a.timestamp - b.timestamp;
        });
      },

      getExpiredOperations: () => {
        const now = Date.now();
        return get().queue.filter((item) => item.expiresAt && item.expiresAt <= now);
      },

      cleanupExpiredOperations: () => {
        const expired = get().getExpiredOperations();
        if (expired.length === 0) return;
        
        set((state) => ({
          queue: state.queue.filter((item) => !expired.find((e) => e.id === item.id)),
          syncMetadata: {
            ...state.syncMetadata,
            totalExpired: state.syncMetadata.totalExpired + expired.length,
          },
        }));
      },

      reset: () => {
        set({
          queue: [],
          syncMetadata: {
            lastSyncAt: null,
            lastSyncStatus: 'success',
            lastError: null,
            totalSynced: 0,
            totalFailed: 0,
            totalExpired: 0,
          },
          isSyncing: false,
        });
      },
    }),
    {
      name: 'bukeng-offline-storage',
      partialize: (state) => ({
        queue: state.queue,
        syncMetadata: state.syncMetadata,
      }),
    }
  )
);