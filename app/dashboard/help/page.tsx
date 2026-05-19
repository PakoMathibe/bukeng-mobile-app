// app/(dashboard)/help/page.tsx
'use client';

import { Mail, Phone, MessageCircle, ExternalLink, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function HelpPage() {
  const faqs = [
    {
      question: 'How do I make a purchase?',
      answer: 'Scan the QR code at any partner merchant checkout and follow the prompts in the app.',
    },
    {
      question: 'When are repayments due?',
      answer: 'Repayments are automatically deducted on the 1st, 15th, and 30th of each month.',
    },
    {
      question: 'What happens if I miss a payment?',
      answer: 'A late fee of R35 applies. Multiple missed payments may affect your credit limit.',
    },
    {
      question: 'How can I increase my credit limit?',
      answer: 'Make on-time payments and complete your KYC verification to qualify for increases.',
    },
  ];

  const supportOptions = [
    { icon: Mail, label: 'Email Support', value: 'support@bukeng.co.za', href: 'mailto:support@bukeng.co.za' },
    { icon: Phone, label: 'Call Us', value: '0800 123 456', href: 'tel:0800123456' },
    { icon: MessageCircle, label: 'Live Chat', value: 'Available 24/7', action: 'chat' },
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Help & Support</h1>
        <p className="text-teal-100 text-sm">
          Get answers to your questions or contact our support team
        </p>
      </div>

      {/* FAQ Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
              <p className="text-sm text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Support Options */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Us</h2>
        <div className="grid grid-cols-1 gap-3">
          {supportOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <Link
                key={index}
                href={option.href || '#'}
                className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <Icon className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.value}</p>
                  </div>
                </div>
                <ExternalLink size={16} className="text-gray-400" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="font-semibold text-amber-800 mb-2">Emergency Support</h3>
        <p className="text-sm text-amber-700 mb-3">
          If you suspect fraudulent activity on your account, contact us immediately.
        </p>
        <button className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition">
          Report Fraud →
        </button>
      </div>
    </div>
  );
}