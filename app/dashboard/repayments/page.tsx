// app/(dashboard)/repayments/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { RepaymentService } from '@/domains/repayments/repaymentService';
import { RepaymentScheduleBuilder } from '@/domains/repayments/repaymentSchedule';
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { format, differenceInDays, isAfter } from 'date-fns';
import { toast } from 'sonner';

export default function RepaymentsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [repayments, setRepayments] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadRepayments();
    }
  }, [user]);

  const loadRepayments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const schedule = await RepaymentService.getRepaymentSchedule(user.id);
      const allInstalments = [...schedule.upcoming, ...schedule.overdue, ...schedule.completed];
      setRepayments(allInstalments);
    } catch (error) {
      console.error('Failed to load repayments:', error);
      toast.error('Failed to load repayment schedule');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (dueDate: Date, status: string) => {
    if (status === 'paid') {
      return {
        text: 'Paid',
        className: 'bg-green-100 text-green-700',
        icon: CheckCircle,
        color: 'text-green-600',
      };
    }

    const daysUntilDue = differenceInDays(dueDate, new Date());

    if (daysUntilDue < 0) {
      return {
        text: 'Overdue',
        className: 'bg-red-100 text-red-700',
        icon: AlertCircle,
        color: 'text-red-600',
      };
    }

    if (daysUntilDue <= 3) {
      return {
        text: 'Due Soon',
        className: 'bg-yellow-100 text-yellow-700',
        icon: Clock,
        color: 'text-yellow-600',
      };
    }

    return {
      text: 'Upcoming',
      className: 'bg-blue-100 text-blue-700',
      icon: Calendar,
      color: 'text-blue-600',
    };
  };

  const handlePayNow = async (repayment: any) => {
    if (!user) return;
    setProcessingId(repayment.id);
    try {
      const transaction = await RepaymentService.makeRepayment(
        user.id,
        repayment.id,
        repayment.amount + (repayment.lateFee || 0)
      );
      toast.success(`Payment of R${repayment.amount} to ${repayment.merchantName} successful!`);
      await loadRepayments(); // Refresh the list
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setProcessingId(null);
    }
  };

  const totalDue = repayments
    .filter((r) => r.status !== 'paid')
    .reduce((sum, r) => sum + r.amount + (r.lateFee || 0), 0);

  const overdueCount = repayments.filter((r) => {
    if (r.status === 'paid') return false;
    return isAfter(new Date(), r.dueDate);
  }).length;

  const upcomingRepayments = repayments.filter(
    (r) => r.status === 'pending' && !isAfter(new Date(), r.dueDate)
  ).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  const nextPayment = upcomingRepayments[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold text-gray-900">Repayments</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-5 text-white">
          <p className="text-sm opacity-90 mb-1">Total Due</p>
          <p className="text-2xl font-bold">R{totalDue.toFixed(2)}</p>
          <p className="text-xs opacity-80 mt-2">
            Across {repayments.filter((r) => r.status !== 'paid').length} instalments
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-600 mb-1">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
          <p className="text-xs text-gray-500 mt-2">
            Pay immediately to avoid additional fees
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm text-gray-600 mb-1">Next Payment</p>
          <p className="text-2xl font-bold text-teal-600">
            R{nextPayment?.amount?.toFixed(2) || 0}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Due {nextPayment ? format(nextPayment.dueDate, 'dd MMM yyyy') : 'N/A'}
          </p>
        </div>
      </div>

      {/* Repayment Schedule */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Repayment Schedule</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {repayments.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>No repayments found</p>
              <p className="text-sm mt-1">All caught up!</p>
            </div>
          ) : (
            repayments.map((repayment) => {
              const status = getStatusConfig(repayment.dueDate, repayment.status);
              const StatusIcon = status.icon;
              const isOverdue = isAfter(new Date(), repayment.dueDate) && repayment.status !== 'paid';

              return (
                <div key={repayment.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {repayment.merchantName || 'Merchant'}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${status.className}`}>
                          <StatusIcon size={12} className="inline mr-1" />
                          {status.text}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Order #{repayment.orderId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        R{repayment.amount}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      <p className="text-sm text-gray-600">
                        Due: {format(repayment.dueDate, 'dd MMM yyyy')}
                      </p>
                      {isOverdue && repayment.lateFee > 0 && (
                        <p className="text-xs text-red-600 ml-2">
                          Late fee: R{repayment.lateFee}
                        </p>
                      )}
                    </div>

                    {repayment.status !== 'paid' && (
                      <button
                        onClick={() => handlePayNow(repayment)}
                        disabled={processingId === repayment.id}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-50"
                      >
                        {processingId === repayment.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CreditCard size={14} />
                        )}
                        {processingId === repayment.id ? 'Processing...' : 'Pay Now'}
                      </button>
                    )}

                    {repayment.status === 'paid' && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle size={14} />
                        <span className="text-sm">
                          Paid on {repayment.paidAt ? format(repayment.paidAt, 'dd MMM yyyy') : 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <AlertCircle size={16} />
          Important Information
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Payments are automatically debited via DebiCheck on due dates</li>
          <li>• You'll receive SMS reminders 48 hours before each payment</li>
          <li>• Late payments incur a R35 fee (capped at R100 per transaction)</li>
          <li>• On-time payments help increase your credit limit</li>
        </ul>
      </div>
    </div>
  );
}