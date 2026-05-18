// app/(dashboard)/map/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MerchantService } from '@/domains/merchants/merchantService';
import { GoogleMapsService } from '@/services/maps/googleMaps';
import { Merchant, GeoLocation } from '@/types/merchant';
import { Navigation, MapPin, Star, X } from 'lucide-react';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export default function MapPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [userLocation, setUserLocation] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Initialize Google Maps
  const initMap = useCallback(() => {
    if (!mapRef.current || !userLocation) return;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: userLocation.lat, lng: userLocation.lng },
      zoom: 14,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });

    // Add user location marker
    new google.maps.Marker({
      position: { lat: userLocation.lat, lng: userLocation.lng },
      map: mapInstanceRef.current,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#0d9488',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
      title: 'Your location',
    });

    addMerchantMarkers();
  }, [userLocation]);

  const addMerchantMarkers = useCallback(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    merchants.forEach(merchant => {
      const marker = new google.maps.Marker({
        position: { lat: merchant.location.lat, lng: merchant.location.lng },
        map: mapInstanceRef.current,
        title: merchant.name,
        animation: google.maps.Animation.DROP,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new google.maps.Size(32, 32),
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-bold text-gray-900">${merchant.name}</h3>
            <p class="text-sm text-gray-600">${merchant.address}</p>
            <div class="flex items-center gap-1 mt-1">
              <span class="text-yellow-500">★</span>
              <span class="text-sm">${merchant.rating} (${merchant.reviewCount} reviews)</span>
            </div>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
        setSelectedMerchant(merchant);
      });

      markersRef.current.push(marker);
    });
  }, [merchants]);

  // Get user location
  useEffect(() => {
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
          // Default to Johannesburg
          setUserLocation({
            lat: -26.140,
            lng: 28.040,
            address: 'Johannesburg',
            placeId: 'johannesburg',
          });
        }
      );
    } else {
      setUserLocation({
        lat: -26.140,
        lng: 28.040,
        address: 'Johannesburg',
        placeId: 'johannesburg',
      });
    }
  }, []);

  // Load merchants when location is available
  useEffect(() => {
    if (!userLocation) return;

    const loadMerchants = async () => {
      setLoading(true);
      try {
        GoogleMapsService.initialize(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!);
        
        const { merchants: nearbyMerchants } = await MerchantService.getNearbyMerchants(userLocation, 5);
        setMerchants(nearbyMerchants);
      } catch (error) {
        console.error('Failed to load merchants:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMerchants();
  }, [userLocation]);

  // Initialize map after merchants load and Google Maps is ready
  useEffect(() => {
    if (userLocation && typeof window !== 'undefined') {
      const checkGoogleMaps = setInterval(() => {
        if (typeof google !== 'undefined' && google.maps) {
          clearInterval(checkGoogleMaps);
          initMap();
        }
      }, 100);
      
      return () => clearInterval(checkGoogleMaps);
    }
  }, [userLocation, merchants, initMap]);

  const getDirections = (merchant: Merchant) => {
    if (!userLocation) return;
    const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${merchant.location.lat},${merchant.location.lng}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-120px)]">
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-[400px] rounded-xl overflow-hidden" />

      {/* Merchant List */}
      <div className="mt-4 space-y-3">
        <h2 className="font-semibold text-gray-900 px-2">Nearby Stores</h2>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {merchants.map((merchant) => (
            <button
              key={merchant.id}
              onClick={() => setSelectedMerchant(merchant)}
              className="w-full bg-white rounded-xl p-4 text-left shadow-sm hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{merchant.name}</h3>
                  <p className="text-sm text-gray-500">{merchant.address}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center">
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      <span className="text-xs ml-1">{merchant.rating}</span>
                    </div>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{merchant.distance?.toFixed(1)} km away</span>
                  </div>
                </div>
                <Navigation className="w-5 h-5 text-teal-600" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Merchant Bottom Sheet */}
      {selectedMerchant && (
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg p-5 animate-slide-up z-10 max-w-md mx-auto">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-gray-900">{selectedMerchant.name}</h3>
              <p className="text-sm text-gray-500">{selectedMerchant.address}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center">
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  <span className="text-xs ml-1">{selectedMerchant.rating}</span>
                </div>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">{selectedMerchant.reviewCount} reviews</span>
              </div>
            </div>
            <button onClick={() => setSelectedMerchant(null)} className="p-1">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => getDirections(selectedMerchant)}
              className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-semibold"
            >
              Get Directions
            </button>
            <button className="flex-1 border border-teal-600 text-teal-600 py-3 rounded-xl font-semibold">
              View Store
            </button>
          </div>
        </div>
      )}
    </div>
  );
}