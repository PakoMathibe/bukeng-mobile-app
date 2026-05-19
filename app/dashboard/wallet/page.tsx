// app/(dashboard)/wallet/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCreditStore } from '@/store/creditStore';
import { TransactionHistoryService } from '@/domains/user/history/transactionHistory';
import {
  CreditCard,
  TrendingUp,
  Shield,
  Clock,
  ArrowUpRight,
  History,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function WalletPage() {
  const { user } = useAuthStore();
  const { summary, refreshCredit, isLoading: creditLoading } = useCreditStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      refreshCredit(user.id);
      loadTransactions();
    }
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;
    setTransactionsLoading(true);
    try {
      const result = await TransactionHistoryService.getTransactions(user.id, { limit: 5 });
      setTransactions(result.transactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  if (!user) return null;

  const totalLimit = summary?.totalLimit || user.creditLimit || 0;
  const availableCredit = summary?.availableCredit || user.availableCredit || 0;
  const usedCredit = totalLimit - availableCredit;
  const utilization = totalLimit > 0 ? (usedCredit / totalLimit) * 100 : 0;
  const onTimePayments = summary?.onTimePayments || user.onTimePayments || 0;

  const isLoading = creditLoading || transactionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
        <Link
          href="/dashboard/transactions"
          className="text-teal-600 text-sm font-medium flex items-center gap-1 hover:underline"
        >
          Transaction History <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* Credit Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-6 text-white">
          <p className="text-sm opacity-90 mb-1">Available Credit</p>
          <p className="text-3xl font-bold">R{availableCredit.toLocaleString()}</p>
          <p className="text-sm opacity-80 mt-2">Ready to use today</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <p className="text-sm text-gray-600">Total Limit</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            R{totalLimit.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Lifetime limit</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-gray-600">Used Credit</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">R{usedCredit.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            {Math.round(utilization)}% of total
          </p>
        </div>
      </div>

      {/* Credit Health Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield size={20} className="text-teal-600" />
          Credit Health
        </h2>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Credit Utilization</span>
              <span className="font-medium">{Math.round(utilization)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  utilization > 80
                    ? 'bg-red-500'
                    : utilization > 50
                    ? 'bg-yellow-500'
                    : 'bg-teal-600'
                }`}
                style={{ width: `${Math.min(utilization, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {utilization > 80
                ? 'High utilization may affect credit limit increases'
                : 'Good utilization - Keep it under 50% for best results'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-green-600">On-time Payments</p>
              <p className="text-xl font-bold text-green-700">{onTimePayments}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600">Late Payments</p>
              <p className="text-xl font-bold text-gray-700">0</p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Next Credit Limit Increase
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Make {Math.max(0, 3 - (onTimePayments % 3))} more on-time payment(s) to
                  increase your limit
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <History size={18} />
            Recent Transactions
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {transactions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <p>No transactions yet</p>
              <p className="text-sm mt-1">Your recent activity will appear here</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition"
              >
                <div>
                  <p className="font-medium text-gray-900">{tx.description || 'Transaction'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-500">
                      {format(new Date(tx.createdAt), 'dd MMM yyyy')}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        tx.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : tx.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
                <p
                  className={`font-semibold ${
                    tx.type === 'repayment' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {tx.type === 'repayment' ? '+' : '-'}R{Math.abs(tx.amount).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}