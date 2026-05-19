// app/(dashboard)/checkout/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useCreditStore } from '@/store/creditStore';
import { PaymentService } from '@/domains/payments/paymentService';
import { MerchantService } from '@/domains/merchants/merchantService';
import { ShoppingBag, CreditCard, QrCode, CheckCircle, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const merchantId = searchParams.get('merchantId');
  const { user } = useAuthStore();
  const { summary, refreshCredit } = useCreditStore();
  
  const [step, setStep] = useState<'scan' | 'confirm' | 'processing' | 'success'>('scan');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [merchantData, setMerchantData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insufficientCredit, setInsufficientCredit] = useState(false);

  // Load merchant if ID is provided
  useEffect(() => {
    if (merchantId) {
      loadMerchant(merchantId);
    }
    if (user) {
      refreshCredit(user.id);
    }
  }, [merchantId, user]);

  const loadMerchant = async (id: string) => {
    try {
      const merchant = await MerchantService.getMerchantById(id);
      if (merchant) {
        setMerchant(merchant.name);
        setMerchantData(merchant);
      }
    } catch (error) {
      console.error('Failed to load merchant:', error);
    }
  };

  const checkCredit = (amountNum: number) => {
    if (!summary) return false;
    if (amountNum > summary.availableCredit) {
      setInsufficientCredit(true);
      setError(`Insufficient credit. Available: R${summary.availableCredit}`);
      return false;
    }
    setInsufficientCredit(false);
    setError(null);
    return true;
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    const amountNum = parseFloat(value);
    if (!isNaN(amountNum) && amountNum > 0) {
      checkCredit(amountNum);
    } else {
      setInsufficientCredit(false);
      setError(null);
    }
  };

  const handleScanQR = () => {
    if (!merchant) {
      toast.error('Please enter merchant name');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    const amountNum = parseFloat(amount);
    if (!checkCredit(amountNum)) {
      toast.error(error || 'Insufficient credit');
      return;
    }
    
    setStep('confirm');
  };

  const handleConfirmPayment = async () => {
    if (!user) {
      toast.error('Please login to continue');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!merchantData && !merchant) {
      toast.error('Merchant information missing');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      // Create order and process payment
      const transaction = await PaymentService.processQRPayment(
        user.id,
        merchantData?.id || 'temp_merchant',
        amountNum
      );
      
      setStep('success');
      
      // Refresh credit after payment
      await refreshCredit(user.id);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/orders');
      }, 2000);
    } catch (err: any) {
      console.error('Payment failed:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setStep('confirm');
      toast.error(err.message || 'Payment failed');
    }
  };

  const handleRetry = () => {
    setStep('confirm');
    setError(null);
  };

  const serviceFee = parseFloat(amount) * 0.008;
  const totalAmount = parseFloat(amount) + serviceFee;
  const monthlyPayment = totalAmount / 3;

  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            Your order has been processed. You'll receive a confirmation shortly.
          </p>
          <div className="animate-pulse text-teal-600 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirecting to orders...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {step === 'scan' ? (
              <QrCode className="w-8 h-8 text-teal-600" />
            ) : (
              <CreditCard className="w-8 h-8 text-teal-600" />
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {step === 'scan' ? 'Scan QR Code' : 'Confirm Payment'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {step === 'scan' 
              ? 'Scan the QR code at the merchant checkout' 
              : 'Review your order before confirming'}
          </p>
        </div>
        
        {step === 'scan' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Merchant Name
              </label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="input-field"
                placeholder="e.g., SPAR Killarney"
                disabled={!!merchantId}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (R)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={`input-field ${insufficientCredit ? 'border-red-500' : ''}`}
                placeholder="0.00"
                step="0.01"
                min="10"
                max="5000"
              />
              {insufficientCredit && (
                <p className="text-xs text-red-500 mt-1">
                  Available credit: R{summary?.availableCredit?.toLocaleString() || '0'}
                </p>
              )}
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Payment Summary:</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Purchase Amount:</span>
                  <span className="font-medium">R{parseFloat(amount || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service Fee (0.8%):</span>
                  <span className="font-medium">R{serviceFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 my-2 pt-2 flex justify-between font-semibold">
                  <span>Total:</span>
                  <span className="text-teal-600">R{totalAmount.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-500 pt-2">
                  Pay in 3 monthly instalments of <strong>R{monthlyPayment.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            
            <button
              onClick={handleScanQR}
              disabled={!merchant || !amount || parseFloat(amount) < 10 || insufficientCredit}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Continue <ArrowRight size={18} />
            </button>
          </div>
        ) : step === 'confirm' ? (
          <div className="space-y-4">
            <div className="bg-teal-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Merchant:</span>
                <span className="font-semibold">{merchant}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold">R{parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Service Fee:</span>
                <span className="font-semibold">R{serviceFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-teal-200 pt-2 mt-2 flex justify-between items-center">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-teal-600">R{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                You will pay <strong>R{monthlyPayment.toFixed(2)}</strong> today, then the same amount for the next 2 months.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => setStep('scan')}
                className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                onClick={handleConfirmPayment}
                className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-semibold hover:bg-teal-700 transition"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Processing your payment...</p>
            <p className="text-sm text-gray-400 mt-2">Please do not close this window</p>
          </div>
        )}
      </div>
    </div>
  );
}