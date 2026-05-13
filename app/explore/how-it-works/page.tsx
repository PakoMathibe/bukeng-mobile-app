// app/(explore)/how-it-works/page.tsx
'use client';

import {
  Smartphone,
  Shield,
  Clock,
  ShoppingBag,
  CreditCard,
  CheckCircle,
} from 'lucide-react';

export default function HowItWorksPage() {
  const steps = [
    {
      icon: Smartphone,
      title: 'Download the App',
      description: 'Get Bukeng from the app store on your Android or iPhone',
      time: '1 minute',
    },
    {
      icon: Shield,
      title: 'Verify Your Identity',
      description: 'Scan your SA ID and take a selfie for FICA compliance',
      time: '60 seconds',
    },
    {
      icon: Clock,
      title: 'Instant Approval',
      description: 'Our credit engine analyzes your bank statements in seconds',
      time: '5 seconds',
    },
    {
      icon: ShoppingBag,
      title: 'Shop & Scan',
      description: 'Scan the QR code at any partner store checkout',
      time: '3 seconds',
    },
  ];

  const benefits = [
    {
      icon: CreditCard,
      title: '0% Interest',
      description: 'Pay in 3 interest-free instalments when you pay on time',
    },
    {
      icon: Clock,
      title: 'Flexible Payments',
      description: 'Spread your payments over 2-3 months',
    },
    {
      icon: Shield,
      title: 'No Credit Record',
      description: 'Approved based on your bank history, not credit score',
    },
    {
      icon: CheckCircle,
      title: 'Transparent Fees',
      description: '0.8% service fee, no hidden charges',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          How Bukeng Works
        </h1>
        <p className="text-xl text-gray-600">
          Get the food you need today and pay in 3 easy instalments
        </p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
        {steps.map((step, index) => (
          <div key={index} className="text-center">
            <div className="relative">
              <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-10 h-10 text-teal-600" />
              </div>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-teal-200" />
              )}
            </div>
            <div className="text-sm text-teal-600 font-semibold mb-2">
              Step {index + 1}
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
            <p className="text-gray-600 text-sm mb-2">{step.description}</p>
            <p className="text-xs text-gray-400">⏱ {step.time}</p>
          </div>
        ))}
      </div>

      {/* Benefits */}
      <div className="bg-gradient-to-r from-teal-50 to-white rounded-2xl p-8 mb-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Why Choose Bukeng
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                <benefit.icon className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {benefit.title}
              </h3>
              <p className="text-sm text-gray-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">
              Do I need a credit record?
            </h3>
            <p className="text-gray-600">
              No! We use your bank transaction history to assess affordability,
              not traditional credit scores.
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">
              What fees does Bukeng charge?
            </h3>
            <p className="text-gray-600">
              We charge a once-off 0.8% service fee. Late payments incur a R35
              fee (capped at R100 per transaction).
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">
              How do I repay?
            </h3>
            <p className="text-gray-600">
              Payments are automatically deducted from your bank account via
              DebiCheck on the scheduled dates.
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">
              Can I use Bukeng at any store?
            </h3>
            <p className="text-gray-600">
              Bukeng is accepted at all partner merchants. Look for the Bukeng
              QR code at checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
