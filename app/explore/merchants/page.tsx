// app/(explore)/merchants/page.tsx
'use client';

import { useState } from 'react';
import { Store, Star, Clock, MapPin } from 'lucide-react';

// Mock merchant data
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
    imageUrl:
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100&h=100&fit=crop',
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
    imageUrl:
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100&h=100&fit=crop',
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
    imageUrl:
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100&h=100&fit=crop',
  },
];

export default function MerchantsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMerchants = mockMerchants.filter((merchant) =>
    merchant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Partner Merchants
        </h1>
        <input
          type="text"
          placeholder="Search merchants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMerchants.map((merchant) => (
          <div
            key={merchant.id}
            className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center">
                  <Store className="w-8 h-8 text-teal-600" />
                </div>
                <div className="flex-1">
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
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={14} />
                  <span>{merchant.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock size={14} />
                  <span>{merchant.distance} away</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span
                  className={`text-sm font-medium ${
                    merchant.open ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {merchant.open ? 'Open Now' : 'Closed'}
                </span>
                <button className="text-teal-600 text-sm font-semibold hover:underline">
                  View Details →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
