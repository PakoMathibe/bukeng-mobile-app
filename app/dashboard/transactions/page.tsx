// app/(dashboard)/transactions/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { TransactionHistoryService } from '@/domains/user/history/transactionHistory';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Calendar,
  Download,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type FilterType = 'all' | 'purchase' | 'repayment' | 'fee';

export default function TransactionsPage() {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await TransactionHistoryService.getTransactions(user.id, { limit: 100 });
      setTransactions(result.transactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // In production, generate CSV/PDF
      const csvData = filteredTransactions.map(tx => ({
        Date: format(new Date(tx.createdAt), 'yyyy-MM-dd'),
        Description: tx.description,
        Amount: tx.amount,
        Type: tx.type,
        Status: tx.status,
        Reference: tx.reference,
      }));
      
      // Create CSV
      const headers = Object.keys(csvData[0] || {}).join(',');
      const rows = csvData.map(row => Object.values(row).join(','));
      const csv = [headers, ...rows].join('\n');
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Transactions exported');
    } catch (error) {
      toast.error('Failed to export transactions');
    } finally {
      setExporting(false);
    }
  };

  const filteredTransactions = transactions
    .filter((tx) => filter === 'all' || tx.type === filter)
    .filter((tx) =>
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const totalSpent = filteredTransactions
    .filter((tx) => tx.type === 'purchase')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalRepaid = filteredTransactions
    .filter((tx) => tx.type === 'repayment')
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <button
          onClick={handleExport}
          disabled={exporting || filteredTransactions.length === 0}
          className="flex items-center gap-2 text-sm text-teal-600 font-medium hover:text-teal-700 disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          Export
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-600 mb-1">Total Spent</p>
          <p className="text-2xl font-bold text-gray-900">R{totalSpent.toLocaleString()}</p>
          <p className="text-xs text-gray-500">All time</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-600 mb-1">Total Repaid</p>
          <p className="text-2xl font-bold text-green-600">R{totalRepaid.toLocaleString()}</p>
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
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p>No transactions found</p>
            <p className="text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tx.type === 'repayment' ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    {tx.type === 'repayment' ? (
                      <ArrowDownLeft className="w-5 h-5 text-green-600" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{tx.description || 'Transaction'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500">
                        {format(new Date(tx.createdAt), 'dd MMM yyyy')}
                      </p>
                      <span className="text-xs text-gray-400">•</span>
                      <p className="text-xs text-gray-500">{tx.reference}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      tx.type === 'repayment' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {tx.type === 'repayment' ? '+' : '-'}R{Math.abs(tx.amount).toLocaleString()}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}