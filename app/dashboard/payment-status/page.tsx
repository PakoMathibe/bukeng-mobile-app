// app/(dashboard)/payment-status/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PaymentStatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status') || 'processing';
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (status === 'success') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push('/dashboard/orders');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, router]);

  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-600',
          bgColor: 'bg-green-100',
          title: 'Payment Successful!',
          message: 'Your payment has been processed successfully.',
          buttonText: 'View Order',
          buttonLink: '/dashboard/orders',
        };
      case 'failed':
        return {
          icon: XCircle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-100',
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again.',
          buttonText: 'Try Again',
          buttonLink: '/dashboard/checkout',
        };
      default:
        return {
          icon: Clock,
          iconColor: 'text-amber-600',
          bgColor: 'bg-amber-100',
          title: 'Processing Payment',
          message:
            'Your payment is being processed. This may take a few moments.',
          buttonText: 'Check Orders',
          buttonLink: '/dashboard/orders',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div
          className={`w-20 h-20 ${config.bgColor} rounded-full flex items-center justify-center mx-auto mb-6`}
        >
          <Icon className={`w-10 h-10 ${config.iconColor}`} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {config.title}
        </h1>
        <p className="text-gray-600 mb-8">{config.message}</p>

        {status === 'processing' && (
          <div className="mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-3">Please wait...</p>
          </div>
        )}

        {status === 'success' && (
          <p className="text-sm text-gray-500 mb-4">
            Redirecting to orders in {countdown} seconds...
          </p>
        )}

        <Link
          href={config.buttonLink}
          className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 transition"
        >
          {config.buttonText}
          <ArrowRight size={18} />
        </Link>

        {status === 'failed' && (
          <div className="mt-4">
            <Link
              href="/dashboard/support"
              className="text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Need help? Contact Support
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
