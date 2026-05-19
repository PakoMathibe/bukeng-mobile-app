// app/(dashboard)/map/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { MerchantService } from '@/domains/merchants/merchantService';
import { GoogleMapsService } from '@/services/maps/googleMaps';
import { Merchant, GeoLocation } from '@/types/merchant';
import { Navigation, MapPin, Star, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export default function MapPage() {
  const { user } = useAuthStore();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [userLocation, setUserLocation] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Initialize Google Maps
  const initMap = useCallback(() => {
    if (!mapRef.current || !userLocation || mapLoaded) return;

    try {
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
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
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
        zIndex: 1000,
      });

      setMapLoaded(true);
      addMerchantMarkers();
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setMapError('Failed to load map. Please try again.');
    }
  }, [userLocation, mapLoaded]);

  const addMerchantMarkers = useCallback(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    merchants.forEach(merchant => {
      if (!merchant.location?.lat || !merchant.location?.lng) return;

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
          <div class="p-2 max-w-[200px]">
            <h3 class="font-bold text-gray-900 text-sm">${merchant.name}</h3>
            <p class="text-xs text-gray-600 mt-1">${merchant.address || ''}</p>
            <div class="flex items-center gap-1 mt-2">
              <span class="text-yellow-500 text-xs">★</span>
              <span class="text-xs text-gray-700">${merchant.rating || 0}</span>
              <span class="text-xs text-gray-400">(${merchant.reviewCount || 0} reviews)</span>
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
    if (!user) {
      setLoading(false);
      return;
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            formattedAddress: 'Current Location',
            placeId: 'current',
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Default to Johannesburg
          setUserLocation({
            lat: -26.140,
            lng: 28.040,
            formattedAddress: 'Johannesburg, South Africa',
            placeId: 'johannesburg',
          });
          toast.warning('Using default location. Enable location for better results.');
        }
      );
    } else {
      setUserLocation({
        lat: -26.140,
        lng: 28.040,
        formattedAddress: 'Johannesburg, South Africa',
        placeId: 'johannesburg',
      });
    }
  }, [user]);

  // Load merchants when location is available
  useEffect(() => {
    if (!userLocation || !user) return;

    const loadMerchants = async () => {
      setLoading(true);
      setMapError(null);
      
      try {
        // Initialize Google Maps with API key
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new Error('Google Maps API key not configured');
        }
        
        GoogleMapsService.initialize(apiKey);
        
        const { merchants: nearbyMerchants } = await MerchantService.getNearbyMerchants(userLocation, 10);
        setMerchants(nearbyMerchants);
      } catch (error) {
        console.error('Failed to load merchants:', error);
        setMapError('Failed to load merchants. Please try again.');
        toast.error('Failed to load nearby merchants');
      } finally {
        setLoading(false);
      }
    };

    loadMerchants();
  }, [userLocation, user]);

  // Load Google Maps script
  useEffect(() => {
    if (!userLocation || mapLoaded || mapError) return;

    const scriptId = 'google-maps-script';
    const existingScript = document.getElementById(scriptId);
    
    const loadScript = () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setMapError('Google Maps API key not configured');
        setLoading(false);
        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initMap();
      };
      script.onerror = () => {
        setMapError('Failed to load Google Maps. Please check your API key.');
        setLoading(false);
      };
      document.head.appendChild(script);
    };

    if (existingScript) {
      if (typeof google !== 'undefined' && google.maps) {
        initMap();
      } else {
        existingScript.onload = () => initMap();
      }
    } else {
      loadScript();
    }
  }, [userLocation, mapLoaded, mapError, initMap]);

  const getDirections = (merchant: Merchant) => {
    if (!userLocation) return;
    const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${merchant.location.lat},${merchant.location.lng}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-gray-500">Loading nearby stores...</p>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <MapPin className="w-8 h-8 text-red-600" />
        </div>
        <p className="text-gray-600 text-center">{mapError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-120px)] pb-32">
      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="w-full h-[400px] rounded-xl overflow-hidden bg-gray-100"
      />

      {/* Merchant List */}
      <div className="mt-4 px-4 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-gray-900">Nearby Stores</h2>
          <span className="text-xs text-gray-500">{merchants.length} stores found</span>
        </div>
        
        {merchants.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No stores found nearby</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your location</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {merchants.map((merchant) => (
              <button
                key={merchant.id}
                onClick={() => setSelectedMerchant(merchant)}
                className="w-full bg-white rounded-xl p-4 text-left shadow-sm hover:shadow-md transition active:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{merchant.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        {merchant.businessType || 'Grocery'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{merchant.address}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center">
                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        <span className="text-xs ml-1">{merchant.rating?.toFixed(1) || 'New'}</span>
                      </div>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{merchant.distance?.toFixed(1)} km away</span>
                    </div>
                  </div>
                  <Navigation className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Merchant Bottom Sheet */}
      {selectedMerchant && (
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg p-5 animate-slide-up z-20 max-w-md mx-auto">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-lg">{selectedMerchant.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                  {selectedMerchant.businessType || 'Grocery'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{selectedMerchant.address}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center">
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  <span className="text-xs ml-1">{selectedMerchant.rating?.toFixed(1) || 'New'}</span>
                </div>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">{selectedMerchant.reviewCount || 0} reviews</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">{selectedMerchant.distance?.toFixed(1)} km away</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedMerchant(null)}
              className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => getDirections(selectedMerchant)}
              className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <Navigation size={18} />
              Get Directions
            </button>
            <button
              onClick={() => window.location.href = `/dashboard/merchants/${selectedMerchant.id}`}
              className="flex-1 border border-teal-600 text-teal-600 py-3 rounded-xl font-semibold hover:bg-teal-50 active:scale-95 transition"
            >
              View Store
            </button>
          </div>
        </div>
      )}
    </div>
  );
}