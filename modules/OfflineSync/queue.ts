// modules/OfflineSync/queue.ts
import { db } from '@/services/firebase/client';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';

export interface QueuedTransaction {
  id?: string;
  userId: string;
  type: 'payment' | 'repayment' | 'kyc';
  data: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const QUEUE_COLLECTION = 'offline_queue';

export class OfflineQueue {
  static async add(
    transaction: Omit<
      QueuedTransaction,
      'id' | 'createdAt' | 'updatedAt' | 'retryCount'
    >
  ): Promise<string> {
    const queueItem = {
      ...transaction,
      retryCount: 0,
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, QUEUE_COLLECTION), {
      ...queueItem,
      createdAt: Timestamp.fromDate(queueItem.createdAt),
      updatedAt: Timestamp.fromDate(queueItem.updatedAt),
    });

    return docRef.id;
  }

  static async getAllPending(): Promise<QueuedTransaction[]> {
    const q = query(
      collection(db, QUEUE_COLLECTION),
      where('status', 'in', ['pending', 'processing']),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as QueuedTransaction[];
  }

  static async updateStatus(
    id: string,
    status: QueuedTransaction['status'],
    retryCount?: number
  ): Promise<void> {
    const docRef = doc(db, QUEUE_COLLECTION, id);
    await addDoc(collection(db, QUEUE_COLLECTION), {
      status,
      ...(retryCount !== undefined && { retryCount }),
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }

  static async remove(id: string): Promise<void> {
    const docRef = doc(db, QUEUE_COLLECTION, id);
    await deleteDoc(docRef);
  }

  static async getPendingCount(): Promise<number> {
    const q = query(
      collection(db, QUEUE_COLLECTION),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  }
}
