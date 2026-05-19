// modules/OfflineSync/queue.ts
import { openDB, IDBPDatabase } from 'idb';

export interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  data: Record<string, unknown>;
  userId: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

class OfflineQueue {
  private db: IDBPDatabase | null = null;
  private static instance: OfflineQueue;
  private readonly DB_NAME = 'bukeng_offline_queue';
  private readonly DB_VERSION = 1;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    this.initPromise = this.init();
  }

  static getInstance(): OfflineQueue {
    if (!OfflineQueue.instance) {
      OfflineQueue.instance = new OfflineQueue();
    }
    return OfflineQueue.instance;
  }

  private async init(): Promise<void> {
    this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('operations')) {
          const store = db.createObjectStore('operations', { keyPath: 'id' });
          store.createIndex('by_status', 'status');
          store.createIndex('by_timestamp', 'timestamp');
          store.createIndex('by_user', 'userId');
        }
      },
    });
  }

  private async ensureDB(): Promise<IDBPDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) {
      await this.initPromise;
    }
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  async add(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    const db = await this.ensureDB();
    const id = crypto.randomUUID();
    const queueItem: QueuedOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: operation.maxRetries || 3,
      status: 'pending',
    };

    await db.add('operations', queueItem);
    return id;
  }

  async getAll(): Promise<QueuedOperation[]> {
    const db = await this.ensureDB();
    const items = await db.getAll('operations');
    return items.sort((a, b) => a.timestamp - b.timestamp);
  }

  async getPending(): Promise<QueuedOperation[]> {
    const db = await this.ensureDB();
    const items = await db.getAllFromIndex('operations', 'by_status', 'pending');
    return items.sort((a, b) => a.timestamp - b.timestamp);
  }

  async updateStatus(id: string, status: QueuedOperation['status'], retryCount?: number): Promise<void> {
    const db = await this.ensureDB();
    const item = await db.get('operations', id);
    if (item) {
      item.status = status;
      if (retryCount !== undefined) item.retryCount = retryCount;
      await db.put('operations', item);
    }
  }

  async remove(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('operations', id);
  }

  async getCount(): Promise<number> {
    const db = await this.ensureDB();
    const all = await db.getAll('operations');
    return all.length;
  }
}

export const offlineQueue = OfflineQueue.getInstance();