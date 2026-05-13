// app/(dashboard)/map/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/services/supabase/client';
import { useLocation } from '@/hooks/useLocation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MapPin, Navigation, Store, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Merchant {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  address: string;
  average_rating?: number;
  review_count?: number;
  distance?: number;
}

export default function MapPage() {
  const {
    location,
    getCurrentLocation,
    loading: locationLoading,
    error: locationError,
  } = useLocation();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(
    null
  );

  const fetchMerchants = useCallback(async (lat: number, lng: number) => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .limit(50);

      if (error) throw error;

      // Calculate distances
      const merchantsWithDistance = (data || [])
        .map((merchant) => ({
          ...merchant,
          distance: calculateDistance(
            lat,
            lng,
            merchant.latitude,
            merchant.longitude
          ),
        }))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setMerchants(merchantsWithDistance);
    } catch (err) {
      console.error('Failed to fetch merchants:', err);
      toast.error('Failed to load merchants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (location) {
      fetchMerchants(location.lat, location.lng);
    } else if (!locationLoading && !location) {
      // Default to Johannesburg if no location
      fetchMerchants(-26.14, 28.04);
    }
  }, [location, locationLoading, fetchMerchants]);

  function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const handleUseMyLocation = () => {
    getCurrentLocation();
  };

  const getDirections = (merchant: Merchant) => {
    if (!location) {
      toast.error('Please enable location to get directions');
      return;
    }
    const url = `https://www.google.com/maps/dir/${location.lat},${location.lng}/${merchant.latitude},${merchant.longitude}`;
    window.open(url, '_blank');
  };

  if (locationLoading && !location) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-gray-500">Getting your location...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Nearby Stores</h1>
        <Button variant="outline" size="sm" onClick={handleUseMyLocation}>
          <Navigation className="w-4 h-4 mr-2" />
          My Location
        </Button>
      </div>

      {/* Map Preview */}
      <div
        className="relative bg-gradient-to-br from-teal-100 to-teal-200 rounded-2xl overflow-hidden"
        style={{ height: '280px' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-teal-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Interactive Map View</p>
            <p className="text-xs text-gray-500">
              {merchants.length} stores nearby
            </p>
          </div>
        </div>

        {/* Mock merchant markers */}
        <div className="absolute inset-0 pointer-events-none">
          {merchants.slice(0, 8).map((merchant, idx) => (
            <div
              key={merchant.id}
              className="absolute w-6 h-6"
              style={{
                left: `${20 + idx * 8}%`,
                top: `${30 + (idx % 3) * 20}%`,
              }}
            >
              <MapPin className="w-5 h-5 text-teal-600 fill-teal-600 drop-shadow" />
            </div>
          ))}
        </div>
      </div>

      {/* Merchant List */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-900">Stores Near You</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-24 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : merchants.length === 0 ? (
          <Card className="p-8 text-center">
            <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No merchants found nearby</p>
          </Card>
        ) : (
          merchants.map((merchant) => (
            <Card
              key={merchant.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedMerchant?.id === merchant.id
                  ? 'ring-2 ring-teal-500'
                  : ''
              }`}
              onClick={() => setSelectedMerchant(merchant)}
            >
              <div className="flex gap-3">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Store className="w-6 h-6 text-teal-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {merchant.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {merchant.category || 'Grocery'}
                      </p>
                    </div>
                    {merchant.average_rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium">
                          {merchant.average_rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                    {merchant.address}
                  </p>
                  {merchant.distance && (
                    <p className="text-xs text-teal-600 mt-2">
                      {merchant.distance.toFixed(1)} km away
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Selected Merchant Actions */}
      {selectedMerchant && (
        <div className="fixed bottom-20 left-4 right-4 md:relative md:bottom-0 md:left-0 md:right-0 animate-slide-up z-10">
          <Card className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-gray-900">
                  {selectedMerchant.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedMerchant.address}
                </p>
              </div>
              <button
                onClick={() => setSelectedMerchant(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => getDirections(selectedMerchant)}
                variant="primary"
                fullWidth
              >
                <Navigation className="w-4 h-4 mr-2" />
                Directions
              </Button>
              <Button variant="outline" fullWidth>
                View Store
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
