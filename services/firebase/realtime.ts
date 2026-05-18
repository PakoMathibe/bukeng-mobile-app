// services/firebase/realtime.ts
import { db, storage } from './client';
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  deleteDoc,
  Unsubscribe,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Types for Firebase sync data
export interface FirebasePayment {
  id: string;
  userId: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
  syncedAt: Date;
}

export interface FirebaseTransaction {
  id: string;
  userId: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  totalAmount: number;
  status: string;
  createdAt: Date;
  syncedAt: Date;
}

export class RealtimeService {
  /**
   * Subscribe to real-time payment updates for a user
   * 
   * @param userId - The user ID to subscribe to
   * @param callback - Called when payments change
   * @returns Unsubscribe function
   */
  static subscribeToPayments(
    userId: string,
    callback: (payments: FirebasePayment[]) => void
  ): Unsubscribe {
    const paymentsRef = collection(db, 'payments');
    const q = query(
      paymentsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const payments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as FirebasePayment[];
        callback(payments);
      },
      (error) => {
        console.error('Firebase subscription error (payments):', error);
        callback([]);
      }
    );
  }

  /**
   * Subscribe to real-time transaction status updates
   * 
   * @param transactionId - The transaction ID to track
   * @param callback - Called when status changes
   * @returns Unsubscribe function
   */
  static subscribeToTransactionStatus(
    transactionId: string,
    callback: (status: string | null) => void
  ): Unsubscribe {
    const transactionRef = doc(db, 'transactions', transactionId);

    return onSnapshot(
      transactionRef,
      (snapshot) => {
        const data = snapshot.data();
        callback(data?.status || null);
      },
      (error) => {
        console.error('Firebase subscription error (transaction):', error);
        callback(null);
      }
    );
  }

  /**
   * Sync payment to Firebase for offline access
   * 
   * @param payment - Payment object from Supabase
   */
  static async syncPaymentToFirebase(payment: FirebasePayment): Promise<void> {
    try {
      const paymentRef = doc(db, 'payments', payment.id);
      await setDoc(paymentRef, {
        ...payment,
        syncedAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to sync payment to Firebase:', error);
      throw new Error('Failed to sync payment for offline access');
    }
  }

  /**
   * Sync transaction to Firebase for offline access
   * 
   * @param transaction - Transaction object from Supabase
   */
  static async syncTransactionToFirebase(transaction: FirebaseTransaction): Promise<void> {
    try {
      const transactionRef = doc(db, 'transactions', transaction.id);
      await setDoc(transactionRef, {
        ...transaction,
        syncedAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to sync transaction to Firebase:', error);
      throw new Error('Failed to sync transaction for offline access');
    }
  }

  /**
   * Update payment status in Firebase
   * 
   * @param paymentId - Payment ID
   * @param status - New status
   */
  static async updatePaymentStatus(
    paymentId: string,
    status: FirebasePayment['status']
  ): Promise<void> {
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      await updateDoc(paymentRef, {
        status,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to update payment status:', error);
      throw new Error('Failed to update payment status');
    }
  }

  /**
   * Delete payment from Firebase (e.g., after cleanup)
   * 
   * @param paymentId - Payment ID
   */
  static async deletePayment(paymentId: string): Promise<void> {
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      await deleteDoc(paymentRef);
    } catch (error) {
      console.error('Failed to delete payment:', error);
      throw new Error('Failed to delete payment');
    }
  }

  /**
   * Sync KYC document to Firebase Storage
   * 
   * @param userId - User ID
   * @param file - File to upload
   * @param type - Document type
   * @returns Download URL
   */
  static async syncKYCDocument(
    userId: string,
    file: File,
    type: 'id' | 'selfie' | 'bank_statement'
  ): Promise<string> {
    try {
      const path = `kyc/${userId}/${type}_${Date.now()}.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (error) {
      console.error('Failed to upload KYC document:', error);
      throw new Error('Failed to upload document');
    }
  }
}