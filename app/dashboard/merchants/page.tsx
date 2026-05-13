// app/(dashboard)/merchants/page.tsx
'use client';

import { useState } from 'react';
import { Store, Star, MapPin, Clock, Search, Filter } from 'lucide-react';
import Link from 'next/link';

const mockMerchants = [
  {
    id: '1',
    name: 'SPAR Killarney',
    type: 'grocery',
    rating: 4.5,
    reviews: 128,
    address: '33 Killarney Mall, Johannesburg',
    distance: '0.8 km',
    open: true,
    hours: '07:00 - 20:00',
  },
  {
    id: '2',
    name: 'Checkers Rosebank',
    type: 'grocery',
    rating: 4.3,
    reviews: 95,
    address: 'The Zone, Rosebank',
    distance: '1.2 km',
    open: true,
    hours: '08:00 - 21:00',
  },
  {
    id: '3',
    name: 'Pick n Pay Sandton',
    type: 'grocery',
    rating: 4.2,
    reviews: 203,
    address: 'Sandton City',
    distance: '2.5 km',
    open: false,
    hours: '08:00 - 19:00',
  },
  {
    id: '4',
    name: 'Woolworths Food',
    type: 'grocery',
    rating: 4.7,
    reviews: 67,
    address: 'Hyde Park Corner',
    distance: '3.1 km',
    open: true,
    hours: '09:00 - 20:00',
  },
];

export default function MerchantsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredMerchants = mockMerchants.filter((merchant) =>
    merchant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Partner Merchants</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
        >
          <Filter size={18} />
          Filter
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search merchants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Merchants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMerchants.map((merchant) => (
          <Link key={merchant.id} href={`/dashboard/merchants/${merchant.id}`}>
            <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                  <Store className="w-6 h-6 text-teal-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {merchant.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">
                          {merchant.rating}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({merchant.reviews} reviews)
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        merchant.open
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {merchant.open ? 'Open' : 'Closed'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin size={14} />
                      <span>{merchant.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock size={14} />
                      <span>{merchant.hours}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {merchant.distance} away
                    </span>
                    <span className="text-teal-600 text-sm font-medium">
                      View Details →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
