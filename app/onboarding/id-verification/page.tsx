// app/(onboarding)/id-verification/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/store/onboardingStore';
import { IdCard, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function IDVerificationPage() {
  const router = useRouter();
  const { setIDVerified, completeStep } = useOnboardingStore();
  const [idNumber, setIdNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const validateIDNumber = (id: string) => {
    // Basic SA ID validation - 13 digits, check digit validation
    if (!/^\d{13}$/.test(id)) return false;

    // Simple check digit validation (SA ID algorithm)
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(id[i]);
      if (i % 2 === 0) {
        total += digit;
      } else {
        let doubled = digit * 2;
        total += doubled > 9 ? doubled - 9 : doubled;
      }
    }
    const checkDigit = (10 - (total % 10)) % 10;
    return checkDigit === parseInt(id[12]);
  };

  const handleVerify = async () => {
    setError('');

    if (!validateIDNumber(idNumber)) {
      setError('Please enter a valid 13-digit South African ID number');
      return;
    }

    setIsVerifying(true);

    // Simulate API call to verify ID
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock successful verification
    setIDVerified(true);
    completeStep('id');
    toast.success('ID verified successfully!');
    router.push('/onboarding/selfie-verification');

    setIsVerifying(false);
  };

  return (
    <div className="card">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <IdCard className="w-10 h-10 text-teal-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Verify Your ID
        </h1>
        <p className="text-gray-600">
          Enter your South African ID number for verification
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SA ID Number
          </label>
          <input
            type="text"
            value={idNumber}
            onChange={(e) => {
              setIdNumber(e.target.value);
              setError('');
            }}
            className={`input-field text-center text-lg tracking-wider font-mono ${
              error ? 'border-red-500' : ''
            }`}
            placeholder="000101 1234 567"
            maxLength={13}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter your 13-digit South African ID number (e.g., 9001011234567)
          </p>
          {error && (
            <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle size={18} className="text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Where to find your ID number
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Your ID number is on your South African ID document or smart ID
                card. It's a 13-digit number starting with your birth date
                (YYMMDD).
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleVerify}
          disabled={isVerifying || idNumber.length !== 13}
          className="btn-primary w-full"
        >
          {isVerifying ? 'Verifying...' : 'Verify ID'}
        </button>
      </div>
    </div>
  );
}
