// app/(dashboard)/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Wallet, TrendingUp, ShoppingBag, QrCode, Lock, Sparkles, ArrowRight, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { TIER_LIMITS } from '@/types/user';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) setLoading(false);
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
        <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  // TIER 0: Explorer Mode
  if (user?.tier === 0) {
    return (
      <div className="space-y-5 pb-20">
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-5 text-white">
          <h1 className="text-xl font-bold mb-2">Welcome to Bukeng!</h1>
          <p className="text-teal-100 text-sm mb-4">
            You're in Explorer mode. See how Bukeng works before committing.
          </p>
          <Link href="/onboarding/start">
            <Button variant="outline" className="bg-white text-teal-600 border-white">
              <Sparkles className="w-4 h-4 mr-2" />
              Complete Verification
            </Button>
          </Link>
        </div>

        <Card className="p-5 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Unlock Full Features</h2>
          <p className="text-gray-600 text-sm mb-4">
            Complete verification to get real credit and start shopping.
          </p>
          <div className="space-y-2 text-left mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Get up to R5,000 credit limit</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Pay in 3 interest-free instalments</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Shop at hundreds of partner stores</span>
            </div>
          </div>
          <Link href="/onboarding/start">
            <Button variant="primary" fullWidth>
              Complete Verification
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </Card>

        <h3 className="font-semibold text-gray-900">Preview Partner Merchants</h3>
        <div className="space-y-3 opacity-60">
          {['SPAR', 'Checkers', 'Pick n Pay', 'Woolworths'].map((merchant) => (
            <Card key={merchant} className="p-4 flex justify-between items-center">
              <span className="font-medium">{merchant}</span>
              <Lock className="w-4 h-4 text-gray-400" />
            </Card>
          ))}
        </div>
        <p className="text-center text-xs text-gray-500 pt-2">
          Verify to see real merchant details and start shopping
        </p>
      </div>
    );
  }

  // TIER 1+: Full Dashboard
  const tierInfo = TIER_LIMITS[user?.tier as 1 | 2 | 3] || TIER_LIMITS[1];
  const utilization = ((user?.creditLimit || 0) - (user?.availableCredit || 0)) / (user?.creditLimit || 1) * 100;

  return (
    <div className="space-y-5 pb-20">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-5 text-white">
        <h1 className="text-xl font-bold mb-1">
          Welcome back, {user?.fullName?.split(' ')[0]}!
        </h1>
        <p className="text-teal-100 text-sm mb-4">
          {tierInfo.name} Member • Credit limit: R{user?.creditLimit?.toLocaleString()}
        </p>
        <Button onClick={() => toast.info('QR Scanner would open here')} variant="outline" className="bg-white text-teal-600 border-white">
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
            R{user?.availableCredit?.toLocaleString() || '0'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            of R{user?.creditLimit?.toLocaleString() || '0'} limit
          </p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <span className="text-sm text-gray-500">Tier</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{tierInfo.name}</p>
          <p className="text-xs text-gray-500 mt-1">
            {user?.tier === 1 ? 'Verify bank for higher limit' : user?.tier === 2 ? '2 more payments to Premium' : 'Premium member'}
          </p>
        </Card>
      </div>
      
      {/* Credit Utilization */}
      <Card className="p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-900">Credit Utilization</h3>
          <span className="text-sm text-gray-500">{Math.round(utilization)}% used</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              utilization > 80 ? 'bg-red-500' : utilization > 50 ? 'bg-yellow-500' : 'bg-teal-600'
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
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/dashboard/merchants">
          <Card className="p-4 text-center hover:shadow-md transition">
            <ShoppingBag className="w-6 h-6 text-teal-600 mx-auto mb-2" />
            <span className="text-sm font-medium">Find Stores</span>
          </Card>
        </Link>
        <Link href="/dashboard/repayments">
          <Card className="p-4 text-center hover:shadow-md transition">
            <Clock className="w-6 h-6 text-teal-600 mx-auto mb-2" />
            <span className="text-sm font-medium">Repayments</span>
          </Card>
        </Link>
      </div>
      
      {/* Tier Upgrade Prompt */}
      {user?.tier === 1 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Upgrade to Trusted Tier</p>
              <p className="text-sm text-amber-700">
                Upload your bank statement to increase your limit to R1,500 and get priority support.
              </p>
              <Link href="/onboarding/bank-upload">
                <button className="mt-2 text-amber-800 text-sm font-semibold underline">
                  Upload Bank Statement →
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {user?.tier === 2 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="font-semibold text-purple-800">Almost Premium!</p>
              <p className="text-sm text-purple-700">
                Make {6 - (user?.onboardingProgress?.bankUploaded ? 3 : 6)} more on-time payments to reach Premium tier with R5,000 limit and 2% cashback.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}