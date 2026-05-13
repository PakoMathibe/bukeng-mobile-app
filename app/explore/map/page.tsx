// app/(explore)/map/page.tsx
'use client';

import { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

// Mock locations
const locations = [
  {
    id: '1',
    name: 'SPAR Killarney',
    lat: -26.145,
    lng: 28.045,
    address: 'Killarney Mall',
  },
  {
    id: '2',
    name: 'Checkers Rosebank',
    lat: -26.14,
    lng: 28.045,
    address: 'The Zone',
  },
  {
    id: '3',
    name: 'Pick n Pay Sandton',
    lat: -26.107,
    lng: 28.054,
    address: 'Sandton City',
  },
];

export default function MapPage() {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Find Stores Near You
        </h1>
        <p className="text-gray-600">
          Discover Bukeng partner merchants in your area
        </p>
      </div>

      {/* Map Placeholder - In production, integrate with Google Maps or Mapbox */}
      <div
        className="bg-gray-200 rounded-xl overflow-hidden mb-8"
        style={{ height: '400px' }}
      >
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-teal-100">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-teal-600 mx-auto mb-3" />
            <p className="text-gray-700">Map View</p>
            <p className="text-sm text-gray-500">
              In production, this would show an interactive map
            </p>
            <p className="text-xs text-gray-400 mt-2">
              with all partner store locations
            </p>
          </div>
        </div>
      </div>

      {/* List of locations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {locations.map((location) => (
          <div
            key={location.id}
            className={`bg-white rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedLocation === location.id ? 'ring-2 ring-teal-500' : ''
            }`}
            onClick={() => setSelectedLocation(location.id)}
          >
            <div className="flex items-start gap-3">
              <Navigation className="w-5 h-5 text-teal-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">{location.name}</h3>
                <p className="text-sm text-gray-600">{location.address}</p>
                <button className="mt-2 text-teal-600 text-sm font-medium hover:underline">
                  Get Directions
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
