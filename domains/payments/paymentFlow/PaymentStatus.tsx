// domains/payments/paymentFlow/PaymentStatus.tsx
'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

interface PaymentStatusProps {
  status: 'processing' | 'success' | 'failed';
  transactionId?: string;
  onComplete?: () => void;
}

export function PaymentStatus({
  status,
  transactionId,
  onComplete,
}: PaymentStatusProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (status === 'success' && onComplete) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, onComplete]);

  const config = {
    processing: {
      icon: Loader2,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-100',
      title: 'Processing Payment',
      message: 'Please wait while we process your payment...',
    },
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100',
      title: 'Payment Successful!',
      message: 'Your payment has been processed successfully.',
    },
    failed: {
      icon: XCircle,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-100',
      title: 'Payment Failed',
      message: 'Your payment could not be processed. Please try again.',
    },
  };

  const current = config[status];
  const Icon = current.icon;

  return (
    <div className="text-center space-y-4">
      <div
        className={`w-20 h-20 ${current.bgColor} rounded-full flex items-center justify-center mx-auto`}
      >
        {status === 'processing' ? (
          <Icon className={`w-10 h-10 ${current.iconColor} animate-spin`} />
        ) : (
          <Icon className={`w-10 h-10 ${current.iconColor}`} />
        )}
      </div>

      <div>
        <h3 className="text-xl font-bold text-gray-900">{current.title}</h3>
        <p className="text-gray-600 mt-1">{current.message}</p>
      </div>

      {transactionId && (
        <p className="text-sm text-gray-500">Transaction ID: {transactionId}</p>
      )}

      {status === 'processing' && (
        <div className="animate-pulse text-sm text-gray-500">
          Do not close this window
        </div>
      )}

      {status === 'success' && (
        <div className="text-sm text-gray-500">
          Redirecting in {countdown} seconds...
        </div>
      )}

      {status === 'failed' && (
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
