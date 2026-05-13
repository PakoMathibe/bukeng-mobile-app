// domains/payments/paymentFlow/PaymentReceipt.tsx
'use client';

import { Download, Share2, Printer } from 'lucide-react';
import { format } from 'date-fns';

interface PaymentReceiptProps {
  receipt: {
    id: string;
    date: Date;
    amount: number;
    merchantName: string;
    transactionId: string;
    paymentMethod: string;
    instalments: Array<{
      number: number;
      amount: number;
      dueDate: Date;
    }>;
  };
  onClose: () => void;
}

export function PaymentReceipt({ receipt, onClose }: PaymentReceiptProps) {
  const handleDownload = () => {
    // In production, generate PDF
    alert('Download receipt (PDF generation would happen here)');
  };

  const handleShare = () => {
    // In production, share via Web Share API
    alert('Share receipt');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="receipt">
      <div className="text-center border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-teal-600">Bukeng</h2>
        <p className="text-gray-500 text-sm">Payment Receipt</p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Receipt No:</span>
          <span className="font-medium">{receipt.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Date:</span>
          <span className="font-medium">
            {format(receipt.date, 'dd MMM yyyy, HH:mm')}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Merchant:</span>
          <span className="font-medium">{receipt.merchantName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Transaction ID:</span>
          <span className="font-mono text-sm">{receipt.transactionId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Payment Method:</span>
          <span className="font-medium capitalize">
            {receipt.paymentMethod}
          </span>
        </div>
      </div>

      <div className="border-t border-b border-gray-200 py-4">
        <div className="flex justify-between text-lg font-bold">
          <span>Total Paid:</span>
          <span className="text-teal-600">R{receipt.amount.toFixed(2)}</span>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-2">Repayment Schedule</h4>
        <div className="space-y-2">
          {receipt.instalments.map((inst, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-600">
                Instalment {inst.number} of 3
              </span>
              <span>R{inst.amount.toFixed(2)}</span>
              <span className="text-gray-500">
                due {format(inst.dueDate, 'dd MMM yyyy')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
        >
          <Download size={16} />
          Download
        </button>
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
        >
          <Share2 size={16} />
          Share
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
        >
          <Printer size={16} />
          Print
        </button>
      </div>

      <button
        onClick={onClose}
        className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition"
      >
        Close
      </button>
    </div>
  );
}
