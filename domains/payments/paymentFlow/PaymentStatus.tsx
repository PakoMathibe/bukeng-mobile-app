// domains/payments/paymentFlow/PaymentStatus.tsx
'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Loader2, ArrowRight } from 'lucide-react';

interface PaymentStatusProps {
  status: 'processing' | 'success' | 'failed';
  transactionId?: string;
  errorMessage?: string;
  onComplete?: () => void;
  onRetry?: () => void;
}

export function PaymentStatus({
  status,
  transactionId,
  errorMessage,
  onComplete,
  onRetry,
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

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const config = {
    processing: {
      icon: Loader2,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-100',
      title: 'Processing Payment',
      message: 'Please wait while we process your payment...',
      subMessage: 'This may take a few moments',
    },
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100',
      title: 'Payment Successful!',
      message: 'Your payment has been processed successfully.',
      subMessage: 'You will receive a confirmation email shortly.',
    },
    failed: {
      icon: XCircle,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-100',
      title: 'Payment Failed',
      message: errorMessage || 'Your payment could not be processed.',
      subMessage: 'Please check your payment details and try again.',
    },
  };

  const current = config[status];
  const Icon = current.icon;

  return (
    <div className="text-center space-y-6 p-4">
      {/* Icon */}
      <div
        className={`w-20 h-20 ${current.bgColor} rounded-full flex items-center justify-center mx-auto transition-all duration-300`}
      >
        {status === 'processing' ? (
          <Icon className={`w-10 h-10 ${current.iconColor} animate-spin`} />
        ) : (
          <Icon className={`w-10 h-10 ${current.iconColor} animate-scale`} />
        )}
      </div>

      {/* Title & Message */}
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-gray-900">{current.title}</h3>
        <p className="text-gray-600">{current.message}</p>
        {current.subMessage && (
          <p className="text-sm text-gray-500">{current.subMessage}</p>
        )}
      </div>

      {/* Transaction ID */}
      {transactionId && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Transaction Reference</p>
          <p className="font-mono text-sm font-medium text-gray-700 break-all">
            {transactionId}
          </p>
        </div>
      )}

      {/* Processing State */}
      {status === 'processing' && (
        <div className="space-y-3">
          <div className="animate-pulse text-sm text-gray-500">
            <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
            Do not close this window
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>
      )}

      {/* Success State */}
      {status === 'success' && (
        <div className="space-y-3">
          <div className="text-sm text-gray-500">
            Redirecting in {countdown} seconds...
          </div>
          <button
            onClick={onComplete}
            className="inline-flex items-center gap-2 text-teal-600 text-sm font-medium hover:underline"
          >
            Continue now
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Failed State */}
      {status === 'failed' && (
        <div className="space-y-3">
          <button
            onClick={handleRetry}
            className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition active:scale-95"
          >
            Try Again
          </button>
          <button
            onClick={() => window.history.back()}
            className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition active:scale-95"
          >
            Go Back
          </button>
          <p className="text-xs text-gray-400">
            Need help? Contact support@bukeng.co.za
          </p>
        </div>
      )}
    </div>
  );
}