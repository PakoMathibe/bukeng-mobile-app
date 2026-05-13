// app/(dashboard)/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCredit } from '@/hooks/useCredit';
import { supabase } from '@/services/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Wallet,
  TrendingUp,
  ShoppingBag,
  QrCode,
  ArrowRight,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface RecentTransaction {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  merchants: { name: string } | null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { profile, loading: creditLoading } = useCredit();
  const [recentTransactions, setRecentTransactions] = useState<
    RecentTransaction[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentTransactions() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('transactions')
          .select(
            `
            id,
            total_amount,
            status,
            created_at,
            merchants (name)
          `
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        setRecentTransactions(data || []);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
        toast.error('Failed to load recent activity');
      } finally {
        setLoading(false);
      }
    }

    fetchRecentTransactions();
  }, [user]);

  const handleScanQR = () => {
    toast.info('QR Scanner', {
      description: 'Position QR code in the frame to scan',
      duration: 3000,
    });
  };

  const utilization =
    profile?.credit_limit && profile?.available_credit
      ? ((profile.credit_limit - profile.available_credit) /
          profile.credit_limit) *
        100
      : 0;

  return (
    <div className="space-y-5 pb-20">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-5 text-white">
        <h1 className="text-xl font-bold mb-1">
          Welcome back, {user?.full_name?.split(' ')[0] || 'User'}!
        </h1>
        <p className="text-teal-100 text-sm mb-4">
          Ready to shop for groceries?
        </p>
        <Button
          onClick={handleScanQR}
          variant="outline"
          className="bg-white text-teal-600 border-white"
        >
          <QrCode className="w-4 h-4 mr-2" />
          Scan QR Code
        </Button>
      </div>

      {/* Credit Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-teal-600" />
            <span className="text-sm text-gray-500">Available</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            R{profile?.available_credit?.toLocaleString() || '0'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            of R{profile?.credit_limit?.toLocaleString() || '0'} limit
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <span className="text-sm text-gray-500">Credit Score</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {profile?.credit_score || '500'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {profile?.risk_level === 'low'
              ? 'Good standing'
              : 'Building credit'}
          </p>
        </Card>
      </div>

      {/* Credit Utilization */}
      <Card className="p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-900">Credit Utilization</h3>
          <span className="text-sm text-gray-500">
            {Math.round(utilization)}% used
          </span>
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
        <p className="text-xs text-gray-500 mt-3">
          {utilization > 80
            ? 'Consider making a repayment to free up credit'
            : utilization > 50
            ? 'Good utilization - Keep it up!'
            : 'You have plenty of credit available'}
        </p>
      </Card>

      {/* Recent Activity */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          <Link
            href="/dashboard/transactions"
            className="text-teal-600 text-sm font-medium"
          >
            View All
          </Link>
        </div>

        {loading || creditLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-16 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : recentTransactions.length === 0 ? (
          <Card className="p-8 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No transactions yet</p>
            <p className="text-sm text-gray-400">
              Scan a QR code to make your first purchase
            </p>
          </Card>
        ) : (
          recentTransactions.map((tx) => (
            <Card key={tx.id} className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {tx.merchants?.name || 'Unknown Merchant'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  R{tx.total_amount}
                </p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    tx.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {tx.status}
                </span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
