// app/(dashboard)/wallet/page.tsx
'use client';

import { useAuthStore } from '@/store/authStore';
import {
  CreditCard,
  TrendingUp,
  Shield,
  Clock,
  ArrowUpRight,
  History,
} from 'lucide-react';
import Link from 'next/link';

export default function WalletPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  const usedCredit = user.creditLimit - user.availableCredit;
  const utilization = (usedCredit / user.creditLimit) * 100;

  const transactions = [
    {
      id: 1,
      date: '2024-01-20',
      description: 'Payment to Checkers',
      amount: -160,
      type: 'repayment',
      status: 'completed',
    },
    {
      id: 2,
      date: '2024-01-15',
      description: 'Purchase at SPAR',
      amount: -450,
      type: 'purchase',
      status: 'completed',
    },
    {
      id: 3,
      date: '2024-01-10',
      description: 'Payment to SPAR',
      amount: -150,
      type: 'repayment',
      status: 'completed',
    },
    {
      id: 4,
      date: '2024-01-05',
      description: 'Purchase at Pick n Pay',
      amount: -280,
      type: 'purchase',
      status: 'active',
    },
    {
      id: 5,
      date: '2024-01-01',
      description: 'Credit limit increase',
      amount: 500,
      type: 'adjustment',
      status: 'completed',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
        <Link
          href="/dashboard/transactions"
          className="text-teal-600 text-sm font-medium flex items-center gap-1"
        >
          Transaction History <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* Credit Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-6 text-white">
          <p className="text-sm opacity-90 mb-1">Available Credit</p>
          <p className="text-3xl font-bold">R{user.availableCredit}</p>
          <p className="text-sm opacity-80 mt-2">Ready to use today</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <p className="text-sm text-gray-600">Total Limit</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            R{user.creditLimit}
          </p>
          <p className="text-xs text-gray-500 mt-1">Lifetime limit</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-gray-600">Used Credit</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">R{usedCredit}</p>
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
                style={{ width: `${utilization}%` }}
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
              <p className="text-xl font-bold text-green-700">3</p>
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
                  Make {3 - (usedCredit > 0 ? 1 : 3)} more on-time payments to
                  increase your limit by R250
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
          {transactions.slice(0, 5).map((tx) => (
            <div
              key={tx.id}
              className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition"
            >
              <div>
                <p className="font-medium text-gray-900">{tx.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-500">{tx.date}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      tx.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {tx.status}
                  </span>
                </div>
              </div>
              <p
                className={`font-semibold ${
                  tx.amount < 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {tx.amount < 0 ? '-' : '+'}R{Math.abs(tx.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
