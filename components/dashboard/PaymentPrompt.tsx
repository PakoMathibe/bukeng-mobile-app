// components/dashboard/PaymentPrompt.tsx
import { Sparkles } from 'lucide-react';

interface PaymentPromptProps {
  paymentsNeeded: number;
}

export function PaymentPrompt({ paymentsNeeded }: PaymentPromptProps) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
        <div>
          <p className="font-semibold text-purple-800">Almost Premium!</p>
          <p className="text-sm text-purple-700">
            Make {paymentsNeeded} more on-time payment(s) to reach Premium tier with R5,000 limit and 2% cashback.
          </p>
        </div>
      </div>
    </div>
  );
}