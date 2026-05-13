// store/offlineStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface SyncMetadata {
  lastSyncAt: Date | null;
  lastSyncStatus: 'success' | 'failed' | 'partial';
  lastError: string | null;
  totalSynced: number;
  totalFailed: number;
}

interface OfflineState {
  isOnline: boolean;
  queue: QueuedOperation[];
  syncMetadata: SyncMetadata;
  isSyncing: boolean;

  setIsOnline: (isOnline: boolean) => void;
  addToQueue: (
    operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>
  ) => string;
  removeFromQueue: (id: string) => void;
  updateRetryCount: (id: string) => void;
  clearQueue: () => void;
  setSyncing: (isSyncing: boolean) => void;
  setSyncMetadata: (metadata: Partial<SyncMetadata>) => void;
  getQueueLength: () => number;
  getQueuedOperations: () => QueuedOperation[];
}

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
      },
      isSyncing: false,

      setIsOnline: (isOnline) => set({ isOnline }),

      addToQueue: (operation) => {
        const id = `queue_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 9)}`;
        const queuedOperation: QueuedOperation = {
          ...operation,
          id,
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: operation.maxRetries || 3,
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
            item.id === id ? { ...item, retryCount: item.retryCount + 1 } : item
          ),
        }));
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

      getQueuedOperations: () => {
        return get().queue;
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
