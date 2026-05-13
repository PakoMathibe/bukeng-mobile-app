// domains/payments/paymentFlow/PaymentConfirmation.tsx
'use client';

import { useState } from 'react';
import { CreditCard, Smartphone, Building, CheckCircle } from 'lucide-react';

interface PaymentConfirmationProps {
  amount: number;
  merchantName: string;
  onConfirm: (method: string) => void;
  onCancel: () => void;
}

export function PaymentConfirmation({
  amount,
  merchantName,
  onConfirm,
  onCancel,
}: PaymentConfirmationProps) {
  const [selectedMethod, setSelectedMethod] = useState('debit');
  const [isProcessing, setIsProcessing] = useState(false);

  const paymentMethods = [
    {
      id: 'debit',
      name: 'Debit Order',
      icon: Building,
      description: 'Auto-deduct from your bank account',
    },
    {
      id: 'card',
      name: 'Card Payment',
      icon: CreditCard,
      description: 'Pay with credit or debit card',
    },
    {
      id: 'qr',
      name: 'Scan QR',
      icon: Smartphone,
      description: 'Scan to pay with your phone',
    },
  ];

  const handleConfirm = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    onConfirm(selectedMethod);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-teal-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Confirm Payment</h3>
        <p className="text-gray-600 mt-1">
          {merchantName} • R{amount.toFixed(2)}
        </p>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h4 className="font-medium text-gray-900 mb-3">Payment Method</h4>
        <div className="space-y-2">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <label
                key={method.id}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${
                  selectedMethod === method.id
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-gray-200 hover:border-teal-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={selectedMethod === method.id}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="w-4 h-4 text-teal-600"
                />
                <Icon className="w-5 h-5 text-gray-500" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{method.name}</div>
                  <div className="text-xs text-gray-500">
                    {method.description}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={isProcessing}
          className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-semibold hover:bg-teal-700 transition disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : 'Confirm Payment'}
        </button>
      </div>
    </div>
  );
}
