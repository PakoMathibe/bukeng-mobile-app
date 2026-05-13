// app/(onboarding)/start/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/store/onboardingStore';
import { ShieldCheck, Mail, Smartphone, IdCard, Camera } from 'lucide-react';

export default function StartPage() {
  const router = useRouter();
  const { setCurrentStep } = useOnboardingStore();

  const handleStart = () => {
    setCurrentStep(0);
    router.push('/onboarding/id-verification');
  };

  const requirements = [
    {
      icon: Mail,
      text: 'Email Verification',
      description: 'Verify your email address',
    },
    {
      icon: Smartphone,
      text: 'Phone Verification',
      description: 'Confirm your mobile number',
    },
    {
      icon: IdCard,
      text: 'ID Verification',
      description: 'Scan your South African ID',
    },
    { icon: Camera, text: 'Selfie Match', description: 'Take a live selfie' },
  ];

  return (
    <div className="card">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-10 h-10 text-teal-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Verify Your Identity
        </h1>
        <p className="text-gray-600">
          To start using Bukeng, we need to verify your identity. This takes
          less than 2 minutes.
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {requirements.map((req, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
              <req.icon className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{req.text}</p>
              <p className="text-sm text-gray-500">{req.description}</p>
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleStart} className="btn-primary w-full">
        Get Started
      </button>

      <p className="text-center text-xs text-gray-500 mt-4">
        Your information is secure and FICA-compliant. We use bank-level
        encryption.
      </p>
    </div>
  );
}
