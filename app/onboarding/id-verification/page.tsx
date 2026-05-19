// app/(onboarding)/id-verification/page.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/store/onboardingStore';
import { IDVerificationStep } from '@/domains/onboarding/steps/idVerification';
import { IdCard, CheckCircle, AlertCircle, Upload, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

export default function IDVerificationPage() {
  const router = useRouter();
  const { setIDVerified, completeStep, setIDNumber, setIDExtractedInfo } = useOnboardingStore();
  const [idNumber, setIdNumberState] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateIDNumberFormat = (id: string) => {
    if (!/^\d{13}$/.test(id)) return false;
    // Check digit validation (SA ID algorithm)
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      
      if (file.size > maxSize) {
        toast.error('File must be less than 5MB');
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a JPG, PNG, or PDF file');
        return;
      }
      setIdFile(file);
    }
  };

  const handleVerify = async () => {
    setError('');

    if (!validateIDNumberFormat(idNumber)) {
      setError('Please enter a valid 13-digit South African ID number');
      return;
    }

    setIsVerifying(true);

    try {
      const result = await IDVerificationStep.verify(idNumber, idFile || undefined);
      
      if (result.valid) {
        setIDVerified(true);
        setIDNumber(idNumber);
        if (result.extractedInfo) {
          setIDExtractedInfo(result.extractedInfo);
        }
        completeStep('id');
        toast.success('ID verified successfully!');
        router.push('/onboarding/selfie-verification');
      } else {
        setError(result.error || 'Verification failed');
        toast.error(result.error || 'Verification failed');
      }
    } catch (err) {
      setError('Verification service error. Please try again.');
      toast.error('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const removeFile = () => {
    setIdFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          Enter your South African ID number and upload your ID document
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
              setIdNumberState(e.target.value);
              setError('');
            }}
            className={`input-field text-center text-lg tracking-wider font-mono ${
              error ? 'border-red-500' : ''
            }`}
            placeholder="900101 1234 567"
            maxLength={13}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter your 13-digit South African ID number
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload ID Document (Optional)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
            {!idFile ? (
              <>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload your ID document</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, or PDF (Max 5MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="id-upload"
                />
                <label
                  htmlFor="id-upload"
                  className="inline-block mt-2 text-teal-600 text-sm font-semibold cursor-pointer hover:underline"
                >
                  Select File
                </label>
              </>
            ) : (
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600" />
                  <span className="text-sm text-gray-700 truncate max-w-[200px]">
                    {idFile.name}
                  </span>
                </div>
                <button onClick={removeFile} className="p-1 hover:bg-gray-200 rounded">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle size={18} className="text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Where to find your ID number
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Your ID number is on your South African ID document or smart ID card.
                It's a 13-digit number starting with your birth date (YYMMDD).
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