// app/(dashboard)/transactions/page.tsx
'use client';

import { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Calendar,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';

const mockTransactions = [
  {
    id: 1,
    date: '2024-01-20',
    description: 'Payment to Checkers',
    amount: -160,
    type: 'repayment',
    status: 'completed',
    reference: 'REP-001',
  },
  {
    id: 2,
    date: '2024-01-15',
    description: 'Purchase at SPAR',
    amount: -450,
    type: 'purchase',
    status: 'completed',
    reference: 'ORD-001',
  },
  {
    id: 3,
    date: '2024-01-10',
    description: 'Payment to SPAR',
    amount: -150,
    type: 'repayment',
    status: 'completed',
    reference: 'REP-002',
  },
  {
    id: 4,
    date: '2024-01-05',
    description: 'Purchase at Pick n Pay',
    amount: -280,
    type: 'purchase',
    status: 'active',
    reference: 'ORD-002',
  },
  {
    id: 5,
    date: '2024-01-01',
    description: 'Credit limit increase',
    amount: 500,
    type: 'adjustment',
    status: 'completed',
    reference: 'ADJ-001',
  },
  {
    id: 6,
    date: '2023-12-28',
    description: 'Late fee',
    amount: -35,
    type: 'fee',
    status: 'completed',
    reference: 'FEE-001',
  },
  {
    id: 7,
    date: '2023-12-25',
    description: 'Payment to Woolworths',
    amount: -200,
    type: 'repayment',
    status: 'completed',
    reference: 'REP-003',
  },
  {
    id: 8,
    date: '2023-12-20',
    description: 'Purchase at Woolworths',
    amount: -600,
    type: 'purchase',
    status: 'completed',
    reference: 'ORD-003',
  },
];

export default function TransactionsPage() {
  const [filter, setFilter] = useState<
    'all' | 'purchase' | 'repayment' | 'fee'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = mockTransactions
    .filter((tx) => filter === 'all' || tx.type === filter)
    .filter((tx) =>
      tx.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const totalSpent = filteredTransactions
    .filter((tx) => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const totalRepaid = filteredTransactions
    .filter((tx) => tx.type === 'repayment')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <button className="flex items-center gap-2 text-sm text-teal-600 font-medium">
          <Download size={16} />
          Export
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-600 mb-1">Total Spent</p>
          <p className="text-2xl font-bold text-gray-900">R{totalSpent}</p>
          <p className="text-xs text-gray-500">All time</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-600 mb-1">Total Repaid</p>
          <p className="text-2xl font-bold text-green-600">R{totalRepaid}</p>
          <p className="text-xs text-gray-500">All time</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'purchase', 'repayment', 'fee'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    tx.amount < 0 ? 'bg-red-50' : 'bg-green-50'
                  }`}
                >
                  {tx.amount < 0 ? (
                    <ArrowUpRight className="w-5 h-5 text-red-600" />
                  ) : (
                    <ArrowDownLeft className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{tx.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-500">
                      {format(new Date(tx.date), 'dd MMM yyyy')}
                    </p>
                    <span className="text-xs text-gray-400">•</span>
                    <p className="text-xs text-gray-500">{tx.reference}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`font-semibold ${
                    tx.amount < 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {tx.amount < 0 ? '-' : '+'}R{Math.abs(tx.amount)}
                </p>
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
          ))}
        </div>
      </div>
    </div>
  );
}
