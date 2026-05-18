// hooks/useRealtimePayments.ts
import { useEffect, useState } from 'react';
import { RealtimeService, FirebasePayment } from '@/services/firebase/realtime';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';

export function useRealtimePayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<FirebasePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const unsubscribe = RealtimeService.subscribeToPayments(
        user.id,
        (newPayments) => {
          setPayments(newPayments);
          setLoading(false);
        },
        (err) => {
          logger.error('Payment subscription error:', err);
          setError('Failed to load real-time payments');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      logger.error('Failed to subscribe to payments:', err);
      setError('Failed to subscribe to payment updates');
      setLoading(false);
      return () => {};
    }
  }, [user]);

  return { payments, loading, error };
}