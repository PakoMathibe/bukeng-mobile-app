// app/(onboarding)/start/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { OnboardingService } from '@/domains/onboarding/onboardingService';
import { ShieldCheck, Smartphone, IdCard, Camera, Sparkles, Clock, Loader2 } from 'lucide-react';

export default function StartPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { resetOnboarding } = useOnboardingStore();
  const [hasProgress, setHasProgress] = useState(false);
  const [lastStep, setLastStep] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkProgress() {
      if (user) {
        const progress = await OnboardingService.getProgress(user.id);
        const hasAnyProgress = Object.values(progress).some(v => v === true);
        setHasProgress(hasAnyProgress);
        setLastStep(progress.lastCompletedStep);
      }
      setLoading(false);
    }
    checkProgress();
  }, [user]);

  const handleFullVerification = () => {
    // Start from the first verification step
    router.push('/onboarding/id-verification');
  };

  const handleExploreFirst = async () => {
    if (user) {
      // Mark onboarding as skipped
      await OnboardingService.updateProgress(user.id, { 
        phoneVerified: false,
        emailVerified: false,
        idVerified: false,
        selfieVerified: false,
        bankUploaded: false,
        lastCompletedStep: 'skipped' 
      });
      resetOnboarding();
      router.push('/dashboard?mode=explorer');
    }
  };

  const handleResume = () => {
    // Resume from the last completed step
    switch (lastStep) {
      case 'phone':
        router.push('/onboarding/id-verification');
        break;
      case 'id':
        router.push('/onboarding/selfie-verification');
        break;
      case 'selfie':
        router.push('/onboarding/bank-upload');
        break;
      case 'bank':
        router.push('/onboarding/success');
        break;
      default:
        router.push('/onboarding/id-verification');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to Bukeng
        </h1>
        <p className="text-gray-600">
          Get food today, pay in 3 instalments
        </p>
      </div>

      {/* Resume Option */}
      {hasProgress && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">Resume Verification</h3>
              <p className="text-sm text-amber-700 mb-3">
                You started verifying earlier. Pick up where you left off.
              </p>
              <button
                onClick={handleResume}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition"
              >
                Resume Verification →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explore First Option */}
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-teal-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Explore First</h3>
            <p className="text-sm text-gray-600 mb-2">
              See how Bukeng works before verifying. Browse merchants, check rates, understand the product.
            </p>
            <div className="text-xs text-gray-500 mb-3">
              ✓ Instant access • No personal data needed • Preview mode
            </div>
            <button
              onClick={handleExploreFirst}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition"
            >
              Explore Now →
            </button>
          </div>
        </div>
      </div>

      {/* Full Verification Option */}
      <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-teal-200 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-teal-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-teal-900">Get Full Access</h3>
            <p className="text-sm text-teal-700 mb-2">
              Complete verification to unlock real credit and start shopping.
            </p>
            <div className="text-xs text-teal-600 mb-3">
              ⏱ Takes ~2 minutes • Credit up to R5,000 • Shop immediately
            </div>
            <button
              onClick={handleFullVerification}
              className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold hover:bg-teal-800 transition"
            >
              Start Verification →
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 pt-4">
        Your data is secure and FICA-compliant. You can upgrade from Explorer anytime.
      </p>
    </div>
  );
}