// hooks/useLocation.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

export function useLocation() {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>(
    'prompt'
  );

  const getCurrentLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setPermission('granted');
        setLoading(false);
        logger.info('Location obtained', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        let errorMessage = 'Failed to get location';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage =
              'Location permission denied. Please enable location services.';
            setPermission('denied');
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        setError(errorMessage);
        setLoading(false);
        logger.error('Geolocation error', err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  const requestPermission = useCallback(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  useEffect(() => {
    // Don't auto-request on mount - let components decide
    setLoading(false);
  }, []);

  return {
    location,
    error,
    loading,
    permission,
    getCurrentLocation,
    requestPermission,
    hasLocation: !!location,
  };
}
