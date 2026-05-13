// app/(explore)/page.tsx
'use client';

import Link from 'next/link';
import { MapPin, Store, Info, ArrowRight } from 'lucide-react';

export default function ExplorePage() {
  const features = [
    {
      icon: MapPin,
      title: 'Find Stores Near You',
      description: 'Discover all Bukeng partner merchants in your area',
      link: '/map',
    },
    {
      icon: Store,
      title: 'Browse Merchants',
      description: 'See ratings, hours, and what each store offers',
      link: '/merchants',
    },
    {
      icon: Info,
      title: 'See How It Works',
      description: 'Learn about our Buy Now Pay Later system',
      link: '/how-it-works',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Explore Bukeng Partners
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Discover thousands of merchants accepting Bukeng. Get food today, pay
          in 3 instalments.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {features.map((feature, i) => (
          <Link key={i} href={feature.link} className="group">
            <div className="bg-white rounded-xl shadow-sm p-6 text-center hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-teal-200 transition">
                <feature.icon className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
              <div className="mt-4 flex items-center justify-center gap-1 text-teal-600 text-sm font-medium">
                Explore <ArrowRight size={16} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-16 bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl font-bold mb-2">Ready to get started?</h2>
        <p className="mb-4">Sign up today and get approved in 60 seconds</p>
        <Link
          href="/register"
          className="bg-white text-teal-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 inline-block"
        >
          Create Free Account
        </Link>
      </div>
    </div>
  );
}
