// app/(onboarding)/bank-upload/page.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/store/onboardingStore';
import { BankStatementUploadStep } from '@/domains/onboarding/steps/bankStatementUpload';
import { Upload, FileText, CheckCircle, ArrowRight, Banknote, Loader2, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

export default function BankUploadPage() {
  const router = useRouter();
  const { setBankUploaded, completeStep, setBankAnalysis } = useOnboardingStore();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    setError(null);
    
    if (uploadedFile) {
      const validation = BankStatementUploadStep.validateFile(uploadedFile);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
      setFile(uploadedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const analysis = await BankStatementUploadStep.upload(file);
      setAnalysisResult(analysis);
      setBankAnalysis(analysis);
      setUploadComplete(true);
      setBankUploaded(true);
      completeStep('bank');
      toast.success('Bank statement uploaded and analyzed!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkip = () => {
    completeStep('bank');
    router.push('/onboarding/success');
  };

  const handleContinue = () => {
    router.push('/onboarding/success');
  };

  const benefits = [
    { icon: Banknote, text: 'Higher credit limit up to R1,500' },
    { icon: CheckCircle, text: 'Better interest rates' },
    { icon: ArrowRight, text: 'Faster approval for future purchases' },
  ];

  return (
    <div className="card">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Banknote className="w-10 h-10 text-teal-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Connect Your Bank
        </h1>
        <p className="text-gray-600">
          Upload your bank statement to increase your credit limit
        </p>
      </div>

      {!uploadComplete ? (
        <>
          <div className="space-y-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-300 hover:border-teal-500'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              {isDragActive ? (
                <p className="text-teal-600">Drop your file here...</p>
              ) : (
                <>
                  <p className="text-gray-600">
                    Drag & drop your bank statement here
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    or click to browse
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Supported formats: PDF, CSV (Max 10MB)
                  </p>
                </>
              )}
            </div>

            {file && (
              <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
                <FileText className="w-8 h-8 text-teal-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-red-500 text-sm hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-600">
                <AlertCircle size={16} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="bg-gradient-to-r from-teal-50 to-teal-100 rounded-lg p-4">
              <h3 className="font-semibold text-teal-800 mb-2">
                Why upload your bank statement?
              </h3>
              <div className="space-y-2">
                {benefits.map((benefit, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm text-teal-700"
                  >
                    <benefit.icon size={14} />
                    <span>{benefit.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Uploading & Analyzing...
                  </>
                ) : (
                  'Upload & Continue'
                )}
              </button>
              <button
                onClick={handleSkip}
                className="px-6 py-3 text-gray-600 font-medium hover:text-gray-800 transition"
              >
                Skip
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Analysis Complete!
            </h3>
            <p className="text-green-700 mb-4">
              Based on your bank statement, your credit limit has been increased
            </p>
            <div className="bg-white rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600">Your new credit limit</p>
              <p className="text-3xl font-bold text-teal-600">
                R{analysisResult?.suggestedCreditLimit || 1500}
              </p>
            </div>
            {analysisResult?.monthlyIncome && (
              <div className="text-sm text-gray-600">
                Monthly income: R{analysisResult.monthlyIncome.toLocaleString()}
              </div>
            )}
          </div>

          <button onClick={handleContinue} className="btn-primary w-full">
            Continue to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}