// services/firebase/realtime.ts
import { db } from './client';
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { supabase } from '@/services/supabase/client';

export class RealtimeService {
  static subscribeToPayments(
    userId: string,
    callback: (payments: any[]) => void
  ): Unsubscribe {
    const paymentsRef = collection(db, 'payments');
    const q = query(
      paymentsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const payments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(payments);
    });
  }

  static subscribeToTransactionStatus(
    transactionId: string,
    callback: (status: string) => void
  ): Unsubscribe {
    const transactionRef = doc(db, 'transactions', transactionId);

    return onSnapshot(transactionRef, (snapshot) => {
      const data = snapshot.data();
      if (data) {
        callback(data.status);
      }
    });
  }

  static async syncPaymentToFirebase(payment: any): Promise<void> {
    const { db } = await import('./client');
    const { doc, setDoc } = await import('firebase/firestore');

    const paymentRef = doc(db, 'payments', payment.id);
    await setDoc(paymentRef, {
      ...payment,
      syncedAt: new Date(),
    });
  }

  static async syncTransactionToFirebase(transaction: any): Promise<void> {
    const { db } = await import('./client');
    const { doc, setDoc } = await import('firebase/firestore');

    const transactionRef = doc(db, 'transactions', transaction.id);
    await setDoc(transactionRef, {
      ...transaction,
      syncedAt: new Date(),
    });
  }
}
