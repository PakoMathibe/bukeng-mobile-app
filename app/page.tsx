// app/(dashboard)/page.tsx
'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Wallet, TrendingUp, ShoppingBag, QrCode, Lock, Sparkles, ArrowRight, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useDashboard } from '@/hooks/useDashboard';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { BankUploadPrompt } from '@/components/dashboard/BankUploadPrompt';
import { PaymentPrompt } from '@/components/dashboard/PaymentPrompt';

// Tier 0 Explorer View Component
function ExplorerDashboard() {
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
          {['Get up to R5,000 credit limit', 'Pay in 3 interest-free instalments', 'Shop at hundreds of partner stores'].map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
        <Link href="/onboarding/start">
          <Button variant="primary" fullWidth>
            Complete Verification
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </Card>
    </div>
  );
}

// Tier 1+ Verified Dashboard Component
interface VerifiedDashboardProps {
  tierName: string;
  totalLimit: number;
  availableCredit: number;
  usedCredit: number;
  utilization: number;
  onTimePayments: number;
  showBankUploadPrompt: boolean;
  showPaymentPrompt: boolean;
  paymentsNeededForUpgrade: number;
}

function VerifiedDashboard({
  tierName,
  totalLimit,
  availableCredit,
  usedCredit,
  utilization,
  showBankUploadPrompt,
  showPaymentPrompt,
  paymentsNeededForUpgrade,
}: VerifiedDashboardProps) {
  return (
    <div className="space-y-5 pb-20">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-5 text-white">
        <h1 className="text-xl font-bold mb-1">Welcome back!</h1>
        <p className="text-teal-100 text-sm mb-4">
          {tierName} Member • Credit limit: R{totalLimit.toLocaleString()}
        </p>
        <Button 
          onClick={() => toast.info('QR Scanner would open here')} 
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
          <p className="text-2xl font-bold text-gray-900">R{availableCredit.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">of R{totalLimit.toLocaleString()} limit</p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <span className="text-sm text-gray-500">Used</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">R{usedCredit.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">{Math.round(utilization)}% of limit</p>
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
          <Card className="p-4 text-center hover:shadow-md transition cursor-pointer">
            <ShoppingBag className="w-6 h-6 text-teal-600 mx-auto mb-2" />
            <span className="text-sm font-medium">Find Stores</span>
          </Card>
        </Link>
        <Link href="/dashboard/repayments">
          <Card className="p-4 text-center hover:shadow-md transition cursor-pointer">
            <Clock className="w-6 h-6 text-teal-600 mx-auto mb-2" />
            <span className="text-sm font-medium">Repayments</span>
          </Card>
        </Link>
      </div>
      
      {/* Upgrade Prompts */}
      {showBankUploadPrompt && <BankUploadPrompt />}
      {showPaymentPrompt && <PaymentPrompt paymentsNeeded={paymentsNeededForUpgrade} />}
    </div>
  );
}

// Main Dashboard Component
export default function DashboardPage() {
  const dashboardData = useDashboard();

  if (dashboardData.isLoading) {
    return <DashboardSkeleton />;
  }

  if (dashboardData.tier === 0) {
    return <ExplorerDashboard />;
  }

  return (
    <VerifiedDashboard
      tierName={dashboardData.tierName}
      totalLimit={dashboardData.totalLimit}
      availableCredit={dashboardData.availableCredit}
      usedCredit={dashboardData.usedCredit}
      utilization={dashboardData.utilization}
      onTimePayments={dashboardData.onTimePayments}
      showBankUploadPrompt={dashboardData.showBankUploadPrompt}
      showPaymentPrompt={dashboardData.showPaymentPrompt}
      paymentsNeededForUpgrade={dashboardData.paymentsNeededForUpgrade}
    />
  );
}