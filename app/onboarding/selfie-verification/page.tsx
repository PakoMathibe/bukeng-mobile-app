// app/(onboarding)/selfie-verification/page.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/store/onboardingStore';
import { SelfieVerificationStep } from '@/domains/onboarding/steps/selfieVerification';
import { Camera, CameraOff, CheckCircle, Upload, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SelfieVerificationPage() {
  const router = useRouter();
  const { setSelfieVerified, completeStep, idNumber } = useOnboardingStore();
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    
    if (file) {
      const validation = SelfieVerificationStep.validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        setError(validation.error || 'Invalid file');
        return;
      }

      setSelfieFile(file);
      const previewUrl = URL.createObjectURL(file);
      setSelfiePreview(previewUrl);
    }
  };

  const handleVerify = async () => {
    if (!selfieFile) {
      toast.error('Please upload a selfie for verification');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const result = await SelfieVerificationStep.verify(selfieFile, idNumber);
      
      if (result.match && result.confidence >= 0.7) {
        setSelfieVerified(true);
        completeStep('selfie');
        toast.success('Selfie verified successfully!');
        router.push('/onboarding/bank-upload');
      } else {
        const errorMsg = `Face match failed (confidence: ${Math.round(result.confidence * 100)}%). Please try another photo.`;
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkip = () => {
    // Skip selfie verification (goes to bank upload)
    completeStep('selfie');
    router.push('/onboarding/bank-upload');
  };

  const handleUseCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // In production, capture frame from video stream
      // For now, fall back to file upload
      stream.getTracks().forEach(track => track.stop());
      fileInputRef.current?.click();
    } catch (err) {
      toast.error('Unable to access camera. Please upload a photo instead.');
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="card">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Camera className="w-10 h-10 text-teal-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Selfie Verification
        </h1>
        <p className="text-gray-600">
          Take a selfie to match with your ID photo
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Your Selfie
          </label>
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-teal-500 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {selfiePreview ? (
              <div className="relative inline-block">
                <img
                  src={selfiePreview}
                  alt="Selfie preview"
                  className="w-40 h-40 rounded-full mx-auto object-cover border-4 border-teal-200"
                />
                <div className="absolute bottom-2 right-1/3 bg-green-500 rounded-full p-1">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <p className="mt-3 text-sm text-gray-600">
                  Photo uploaded successfully
                </p>
              </div>
            ) : (
              <>
                <CameraOff className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Click to upload a selfie</p>
                <p className="text-xs text-gray-500 mt-1">
                  Make sure your face is clearly visible, no sunglasses or hats
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Supported formats: JPG, PNG (Max 5MB)
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUseCamera();
                  }}
                  className="mt-3 text-teal-600 text-sm font-medium hover:underline"
                >
                  Or take a photo with camera
                </button>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            onChange={handleSelfieUpload}
            className="hidden"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Camera className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Tips for a good selfie
              </p>
              <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                <li>• Use good lighting, face the light source</li>
                <li>• Look directly at the camera</li>
                <li>• Remove glasses if possible</li>
                <li>• Use a plain background</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          onClick={handleVerify}
          disabled={isVerifying || !selfieFile}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Selfie'
          )}
        </button>

        <button
          onClick={handleSkip}
          className="w-full text-gray-500 text-sm font-medium hover:text-gray-700 transition"
        >
          Skip for now (I'll verify later)
        </button>
      </div>
    </div>
  );
}