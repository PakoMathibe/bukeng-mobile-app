// domains/payments/paymentFlow/PaymentReceipt.tsx
'use client';

import { Download, Share2, Printer, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useRef } from 'react';
import { toast } from 'sonner';

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
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    try {
      // In production, generate PDF using a library like jsPDF or react-pdf
      // For now, show toast that this would generate a PDF
      toast.info('PDF generation would happen here', {
        description: 'Receipt would be downloaded as PDF',
      });
      
      // Example with jsPDF (commented out):
      // const doc = new jsPDF();
      // doc.text(`Bukeng Payment Receipt`, 20, 20);
      // doc.text(`Receipt No: ${receipt.id}`, 20, 40);
      // doc.text(`Amount: R${receipt.amount}`, 20, 60);
      // doc.save(`receipt_${receipt.id}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate receipt');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Bukeng Payment Receipt',
      text: `Payment of R${receipt.amount} to ${receipt.merchantName}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Shared successfully');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
          toast.error('Failed to share');
        }
      }
    } else {
      // Fallback: copy to clipboard
      const receiptText = `
Bukeng Payment Receipt
Receipt No: ${receipt.id}
Date: ${format(receipt.date, 'dd MMM yyyy, HH:mm')}
Merchant: ${receipt.merchantName}
Amount: R${receipt.amount.toFixed(2)}
Transaction ID: ${receipt.transactionId}
      `.trim();
      
      await navigator.clipboard.writeText(receiptText);
      toast.success('Receipt copied to clipboard');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="receipt" ref={receiptRef}>
      <div className="text-center border-b border-gray-200 pb-4">
        <div className="flex justify-center mb-2">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-teal-600">Bukeng</h2>
        <p className="text-gray-500 text-sm">Payment Receipt</p>
        <p className="text-green-600 text-sm mt-1">Payment Successful</p>
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
            {receipt.paymentMethod.replace('_', ' ')}
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

      <div className="bg-gray-50 rounded-lg p-3 text-center">
        <p className="text-xs text-gray-500">
          This is a computer-generated receipt and does not require a signature.
          For support, contact support@bukeng.co.za
        </p>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition active:scale-95"
        >
          <Download size={16} />
          Download
        </button>
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition active:scale-95"
        >
          <Share2 size={16} />
          Share
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition active:scale-95"
        >
          <Printer size={16} />
          Print
        </button>
      </div>

      <button
        onClick={onClose}
        className="w-full py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition active:scale-95"
      >
        Close
      </button>
    </div>
  );
}