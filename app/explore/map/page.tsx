// app/(explore)/map/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { GoogleMapsService, GeoLocation } from '@/services/maps/googleMaps';

// Mock locations - would come from API in production
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
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<GeoLocation | null>(null);

  useEffect(() => {
    // Initialize Google Maps
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      GoogleMapsService.initialize(apiKey);
      setMapLoaded(true);
    }

    // Get user location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Current Location',
            placeId: 'current',
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  }, []);

  const getDirections = (location: typeof locations[0]) => {
    const url = `https://www.google.com/maps/dir/${userLocation?.lat || -26.140},${userLocation?.lng || 28.040}/${location.lat},${location.lng}`;
    window.open(url, '_blank');
  };

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

      {/* Map View */}
      <div
        className="bg-gray-200 rounded-xl overflow-hidden mb-8"
        style={{ height: '400px' }}
      >
        {mapLoaded ? (
          <div className="w-full h-full relative">
            {/* In production, integrate actual Google Maps here */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-teal-50 to-teal-100">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-teal-600 mx-auto mb-3" />
                <p className="text-gray-700">Interactive Map View</p>
                <p className="text-sm text-gray-500">
                  {locations.length} partner stores in your area
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Sign in to see real-time store locations
                </p>
                <div className="mt-4 flex gap-3 justify-center">
                  <Link
                    href="/auth/register"
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold"
                  >
                    Sign Up to Explore
                  </Link>
                  <Link
                    href="/auth/login"
                    className="px-4 py-2 border border-teal-600 text-teal-600 rounded-lg text-sm font-semibold"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
        )}
      </div>

      {/* Store List */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Partner Stores
        </h2>
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
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {location.name}
                  </h3>
                  <p className="text-sm text-gray-500">{location.address}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      getDirections(location);
                    }}
                    className="mt-2 text-teal-600 text-sm font-medium hover:underline inline-flex items-center gap-1"
                  >
                    <Navigation size={14} />
                    Get Directions
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Sign up to see real-time store locations, availability, and exclusive offers.
        </p>
        <div className="mt-3 flex gap-3 justify-center">
          <Link
            href="/auth/register"
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition"
          >
            Create Free Account
          </Link>
          <Link
            href="/auth/login"
            className="px-4 py-2 border border-teal-600 text-teal-600 rounded-lg text-sm font-semibold hover:bg-teal-50 transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}