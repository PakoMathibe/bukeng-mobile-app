// components/dashboard/BankUploadPrompt.tsx
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export function BankUploadPrompt() {
  return (
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
  );
}