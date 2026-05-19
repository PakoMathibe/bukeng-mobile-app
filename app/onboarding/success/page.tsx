// app/(onboarding)/success/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useCreditStore } from '@/store/creditStore';
import { CheckCircle, CreditCard, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SuccessPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { resetOnboarding } = useOnboardingStore();
  const { summary, isLoading } = useCreditStore();

  useEffect(() => {
    // Trigger confetti once on mount
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      startVelocity: 15,
      colors: ['#0d9488', '#14b8a6', '#f59e0b'],
    });

    // Second burst for effect
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 100,
        origin: { y: 0.5, x: 0.3 },
        startVelocity: 10,
      });
    }, 200);
  }, []);

  const handleGoToDashboard = () => {
    // Update user tier to verified
    if (user) {
      const updatedUser = {
        ...user,
        tier: 1 as const,
        isVerified: true,
        creditLimit: summary?.creditLimit || 1000,
        availableCredit: summary?.availableCredit || 1000,
      };
      setUser(updatedUser);
    }

    resetOnboarding();
    router.push('/dashboard');
  };

  // If no user, redirect to login
  if (!user && !isLoading) {
    router.push('/auth/login');
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  const achievements = [
    { icon: CheckCircle, text: 'Identity verified' },
    { icon: CreditCard, text: `R${summary?.creditLimit || 1000} credit limit approved` },
    { icon: ShoppingBag, text: 'Ready to shop at partner stores' },
  ];

  return (
    <div className="card text-center animate-fade-in">
      <div className="mb-6">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-scale">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Welcome to Bukeng!
      </h1>
      <p className="text-gray-600 mb-8">
        Your account has been successfully verified
      </p>

      <div className="bg-gradient-to-r from-teal-50 to-teal-100 rounded-xl p-6 mb-8">
        <div className="text-sm text-teal-600 font-semibold mb-1">
          Your Credit Limit
        </div>
        <div className="text-4xl font-bold text-teal-600 mb-2">
          R{summary?.creditLimit?.toLocaleString() || '1,000'}
        </div>
        <div className="text-xs text-teal-500">
          Available to use immediately
        </div>
        {summary?.creditScore && (
          <div className="mt-2 text-xs text-teal-500">
            Credit Score: {summary.creditScore}
          </div>
        )}
      </div>

      <div className="space-y-3 mb-8 text-left">
        {achievements.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <item.icon className="w-5 h-5 text-green-600" />
            <span className="text-gray-700">{item.text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleGoToDashboard}
        className="btn-primary w-full flex items-center justify-center gap-2 group"
      >
        Go to Dashboard
        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
      </button>

      <p className="text-xs text-gray-500 mt-4">
        You can now make purchases at any Bukeng partner store
      </p>
    </div>
  );
}