// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingBag,
  Clock,
  Shield,
  Smartphone,
  ChevronRight,
} from 'lucide-react';

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-amber-50">
      {/* Hero Section */}
      <div className="relative px-5 pt-12 pb-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo-icon.png"
              alt="Bukeng"
              width={60}
              height={60}
              className="w-15 h-15"
            />
          </div>
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-teal-600 to-teal-800 bg-clip-text text-transparent">
            Bukeng
          </h1>
          <p className="text-xl text-gray-700 mb-2">
            "Because Food Can't Wait."
          </p>
          <p className="text-gray-600 text-sm mb-8 max-w-xs mx-auto">
            Africa's first Buy Now Pay Later platform built exclusively for
            food.
          </p>

          <div className="flex gap-3 justify-center">
            <Link href="/auth/register" className="btn-primary text-base">
              Get Started
            </Link>
            <Link href="/auth/login" className="btn-secondary text-base">
              Sign In
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-10 max-w-xs mx-auto">
          <div className="text-center bg-white/60 backdrop-blur-sm rounded-xl py-3">
            <div className="text-2xl font-bold text-teal-600">60s</div>
            <div className="text-xs text-gray-600">Approval</div>
          </div>
          <div className="text-center bg-white/60 backdrop-blur-sm rounded-xl py-3">
            <div className="text-2xl font-bold text-teal-600">0%</div>
            <div className="text-xs text-gray-600">Interest</div>
          </div>
          <div className="text-center bg-white/60 backdrop-blur-sm rounded-xl py-3">
            <div className="text-2xl font-bold text-teal-600">R500+</div>
            <div className="text-xs text-gray-600">Credit</div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-t-3xl px-5 py-8 mt-4">
        <h2 className="text-xl font-bold text-center text-gray-900 mb-6">
          How It Works
        </h2>
        <div className="space-y-4">
          {[
            {
              icon: Smartphone,
              title: 'Download App',
              desc: 'Get Bukeng from app store',
              step: '1',
            },
            {
              icon: Shield,
              title: 'Verify Identity',
              desc: 'SA ID + selfie in 60 seconds',
              step: '2',
            },
            {
              icon: Clock,
              title: 'Instant Approval',
              desc: 'Credit decision in seconds',
              step: '3',
            },
            {
              icon: ShoppingBag,
              title: 'Shop & Pay',
              desc: 'Scan QR code at checkout',
              step: '4',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition"
            >
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                <item.icon className="w-6 h-6 text-teal-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-600">
                    Step {item.step}
                  </span>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                </div>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 py-8">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 text-center">
          <div className="flex justify-center mb-3">
            <Image
              src="/logo-icon-white.png"
              alt="Bukeng"
              width={40}
              height={40}
              className="w-10 h-10"
            />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Ready to get started?
          </h2>
          <p className="text-teal-100 text-sm mb-4">
            Join thousands of happy customers
          </p>
          <Link
            href="/auth/register"
            className="inline-block bg-white text-teal-600 px-6 py-3 rounded-xl font-semibold shadow-lg"
          >
            Create Free Account
          </Link>
        </div>
      </div>

      {/* Bottom padding for safe area */}
      <div className="h-20" />
    </div>
  );
}