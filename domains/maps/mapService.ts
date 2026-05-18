// domains/maps/mapService.ts
import { GeoLocation, Merchant } from '@/types/merchant';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapSearchResult {
  merchants: Merchant[];
  total: number;
  bounds: MapBounds;
  center: GeoLocation;
}

export interface RouteInfo {
  distance: string;
  distanceValue: number; // in meters
  duration: string;
  durationValue: number; // in seconds
  steps: RouteStep[];
  polyline: string;
  startLocation: GeoLocation;
  endLocation: GeoLocation;
}

export interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
  startLocation: GeoLocation;
  endLocation: GeoLocation;
  maneuver: 'turn-left' | 'turn-right' | 'straight' | 'destination';
}

export interface GeocodingResult {
  location: GeoLocation;
  confidence: number;
  source: 'google' | 'mapbox' | 'osm';
}

export class MapService {
  private static googleMapsApiKey: string | null = null;
  private static mapboxToken: string | null = null;
  private static activeProvider: 'google' | 'mapbox' = 'google';
  private static isInitialized = false;

  static initialize(googleApiKey?: string, mapboxToken?: string): void {
    if (googleApiKey) {
      this.googleMapsApiKey = googleApiKey;
      this.activeProvider = 'google';
    } else if (mapboxToken) {
      this.mapboxToken = mapboxToken;
      this.activeProvider = 'mapbox';
    } else {
      throw new Error('Map service requires either Google Maps API key or Mapbox token');
    }
    this.isInitialized = true;
    logger.info('Map service initialized', { provider: this.activeProvider });
  }

  private static async fetchWithTimeout(url: string, timeoutMs: number = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  static async getNearbyMerchants(
    location: GeoLocation,
    radius: number = 5,
    bounds?: MapBounds
  ): Promise<MapSearchResult> {
    try {
      const { MerchantService } = await import('@/domains/merchants/merchantService');
      let merchants = await MerchantService.getNearbyMerchants(location, radius);

      if (bounds) {
        merchants = merchants.filter((m) => {
          const lat = m.location.lat;
          const lng = m.location.lng;
          return (
            lat <= bounds.north &&
            lat >= bounds.south &&
            lng <= bounds.east &&
            lng >= bounds.west
          );
        });
      }

      let calculatedBounds: MapBounds;
      if (merchants.length > 0) {
        calculatedBounds = {
          north: Math.max(...merchants.map((m) => m.location.lat)),
          south: Math.min(...merchants.map((m) => m.location.lat)),
          east: Math.max(...merchants.map((m) => m.location.lng)),
          west: Math.min(...merchants.map((m) => m.location.lng)),
        };
      } else {
        calculatedBounds = {
          north: location.lat + 0.05,
          south: location.lat - 0.05,
          east: location.lng + 0.05,
          west: location.lng - 0.05,
        };
      }

      return {
        merchants,
        total: merchants.length,
        bounds: calculatedBounds,
        center: location,
      };
    } catch (error) {
      logger.error('Failed to get nearby merchants', error);
      throw error;
    }
  }

  static async searchLocation(query: string): Promise<GeocodingResult[]> {
    if (!this.isInitialized) {
      throw new Error('Map service not initialized. Call initialize() first.');
    }

    try {
      if (this.activeProvider === 'google' && this.googleMapsApiKey) {
        return await this.searchLocationGoogle(query);
      } else if (this.activeProvider === 'mapbox' && this.mapboxToken) {
        return await this.searchLocationMapbox(query);
      }
      return [];
    } catch (error) {
      logger.error('Failed to search location', error);
      return [];
    }
  }

  private static async searchLocationGoogle(query: string): Promise<GeocodingResult[]> {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&key=${this.googleMapsApiKey}&region=za&components=country:ZA`;

    const response = await this.fetchWithTimeout(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results) {
      return [];
    }

    return data.results.map((result: any) => ({
      location: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
      },
      confidence: result.geometry.location_type === 'ROOFTOP' ? 1.0 : 0.7,
      source: 'google',
    }));
  }

  private static async searchLocationMapbox(query: string): Promise<GeocodingResult[]> {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${this.mapboxToken}&country=za&limit=5`;

    const response = await this.fetchWithTimeout(url);
    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return [];
    }

    return data.features.map((feature: any) => ({
      location: {
        lat: feature.center[1],
        lng: feature.center[0],
        formattedAddress: feature.place_name,
        placeId: feature.id,
      },
      confidence: feature.relevance / 10,
      source: 'mapbox',
    }));
  }

  static async reverseGeocode(location: GeoLocation): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Map service not initialized. Call initialize() first.');
    }

    try {
      if (this.activeProvider === 'google' && this.googleMapsApiKey) {
        return await this.reverseGeocodeGoogle(location);
      } else if (this.activeProvider === 'mapbox' && this.mapboxToken) {
        return await this.reverseGeocodeMapbox(location);
      }
      return 'Address not found';
    } catch (error) {
      logger.error('Failed to reverse geocode', error);
      return 'Address not found';
    }
  }

  private static async reverseGeocodeGoogle(location: GeoLocation): Promise<string> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=${this.googleMapsApiKey}`;

    const response = await this.fetchWithTimeout(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return 'Address not found';
    }

    return data.results[0].formatted_address;
  }

  private static async reverseGeocodeMapbox(location: GeoLocation): Promise<string> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.lng},${location.lat}.json?access_token=${this.mapboxToken}&types=address,poi`;

    const response = await this.fetchWithTimeout(url);
    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return 'Address not found';
    }

    return data.features[0].place_name;
  }

  static async getDirections(
    origin: GeoLocation,
    destination: GeoLocation,
    travelMode: 'driving' | 'walking' | 'transit' = 'driving'
  ): Promise<RouteInfo> {
    if (!this.isInitialized) {
      throw new Error('Map service not initialized. Call initialize() first.');
    }

    try {
      if (this.activeProvider === 'google' && this.googleMapsApiKey) {
        return await this.getDirectionsGoogle(origin, destination, travelMode);
      } else if (this.activeProvider === 'mapbox' && this.mapboxToken) {
        return await this.getDirectionsMapbox(origin, destination, travelMode);
      }
      throw new Error('No map provider configured');
    } catch (error) {
      logger.error('Failed to get directions', error);
      throw error;
    }
  }

  private static async getDirectionsGoogle(
    origin: GeoLocation,
    destination: GeoLocation,
    travelMode: 'driving' | 'walking' | 'transit'
  ): Promise<RouteInfo> {
    const modeMap = { driving: 'driving', walking: 'walking', transit: 'transit' };
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=${modeMap[travelMode]}&key=${this.googleMapsApiKey}`;

    const response = await this.fetchWithTimeout(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    const steps: RouteStep[] = leg.steps.map((step: any) => ({
      instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
      distance: step.distance.text,
      duration: step.duration.text,
      startLocation: {
        lat: step.start_location.lat,
        lng: step.start_location.lng,
        formattedAddress: '',
        placeId: '',
      },
      endLocation: {
        lat: step.end_location.lat,
        lng: step.end_location.lng,
        formattedAddress: '',
        placeId: '',
      },
      maneuver: this.parseManeuver(step.maneuver),
    }));

    return {
      distance: leg.distance.text,
      distanceValue: leg.distance.value,
      duration: leg.duration.text,
      durationValue: leg.duration.value,
      steps,
      polyline: route.overview_polyline.points,
      startLocation: origin,
      endLocation: destination,
    };
  }

  private static async getDirectionsMapbox(
    origin: GeoLocation,
    destination: GeoLocation,
    travelMode: 'driving' | 'walking' | 'transit'
  ): Promise<RouteInfo> {
    const profileMap = { driving: 'driving', walking: 'walking', transit: 'driving' };
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profileMap[travelMode]}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=polyline&steps=true&access_token=${this.mapboxToken}&language=en`;

    const response = await this.fetchWithTimeout(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    const steps: RouteStep[] = leg.steps.map((step: any) => ({
      instruction: step.maneuver.instruction,
      distance: `${(step.distance / 1000).toFixed(1)} km`,
      duration: `${Math.round(step.duration / 60)} min`,
      startLocation: origin,
      endLocation: destination,
      maneuver: this.parseManeuver(step.maneuver.type),
    }));

    return {
      distance: `${(route.distance / 1000).toFixed(1)} km`,
      distanceValue: route.distance,
      duration: `${Math.round(route.duration / 60)} min`,
      durationValue: route.duration,
      steps,
      polyline: route.geometry,
      startLocation: origin,
      endLocation: destination,
    };
  }

  static async getStaticMapImage(
    center: GeoLocation,
    zoom: number = 15,
    width: number = 600,
    height: number = 400,
    markers?: GeoLocation[]
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Map service not initialized. Call initialize() first.');
    }

    try {
      if (this.activeProvider === 'google' && this.googleMapsApiKey) {
        let url = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=${width}x${height}&key=${this.googleMapsApiKey}`;

        if (markers) {
          markers.forEach((marker) => {
            url += `&markers=color:red|${marker.lat},${marker.lng}`;
          });
        }
        return url;
      } else if (this.activeProvider === 'mapbox' && this.mapboxToken) {
        let url = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${center.lng},${center.lat},${zoom}/${width}x${height}?access_token=${this.mapboxToken}`;
        if (markers && markers.length > 0) {
          url += `&marker=pin-s-teal+${markers[0].lng},${markers[0].lat}`;
        }
        return url;
      }
      throw new Error('No map provider configured');
    } catch (error) {
      logger.error('Failed to get static map image', error);
      throw error;
    }
  }

  static async autocomplete(
    input: string
  ): Promise<Array<{ description: string; placeId: string; location?: GeoLocation }>> {
    if (!this.isInitialized || !input || input.length < 2) {
      return [];
    }

    try {
      if (this.activeProvider === 'google' && this.googleMapsApiKey) {
        return await this.autocompleteGoogle(input);
      } else if (this.activeProvider === 'mapbox' && this.mapboxToken) {
        return await this.autocompleteMapbox(input);
      }
      return [];
    } catch (error) {
      logger.error('Failed to autocomplete', error);
      return [];
    }
  }

  private static async autocompleteGoogle(input: string): Promise<Array<{ description: string; placeId: string; location?: GeoLocation }>> {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${this.googleMapsApiKey}&components=country:za`;

    const response = await this.fetchWithTimeout(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.predictions) {
      return [];
    }

    return data.predictions.map((prediction: any) => ({
      description: prediction.description,
      placeId: prediction.place_id,
    }));
  }

  private static async autocompleteMapbox(input: string): Promise<Array<{ description: string; placeId: string; location?: GeoLocation }>> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input)}.json?access_token=${this.mapboxToken}&country=za&autocomplete=true&limit=5`;

    const response = await this.fetchWithTimeout(url);
    const data = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature: any) => ({
      description: feature.place_name,
      placeId: feature.id,
      location: feature.center ? {
        lat: feature.center[1],
        lng: feature.center[0],
        formattedAddress: feature.place_name,
        placeId: feature.id,
      } : undefined,
    }));
  }

  static async getCurrentLocation(): Promise<GeoLocation> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new AppError('Geolocation not supported', 'GEOLOCATION_UNSUPPORTED', 400));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            formattedAddress: 'Current Location',
            placeId: 'current_location',
          });
        },
        (error) => {
          let message = 'Failed to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location permission denied. Please enable location services.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out';
              break;
          }
          reject(new AppError(message, 'GEOLOCATION_ERROR', 400));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  static async getAddressFromLocation(location: GeoLocation): Promise<string> {
    return this.reverseGeocode(location);
  }

  private static parseManeuver(maneuver: string): RouteStep['maneuver'] {
    if (!maneuver) return 'straight';
    if (maneuver.includes('left')) return 'turn-left';
    if (maneuver.includes('right')) return 'turn-right';
    if (maneuver.includes('arrive') || maneuver.includes('destination')) return 'destination';
    return 'straight';
  }

  static calculateDistance(point1: GeoLocation, point2: GeoLocation): number {
    const R = 6371000;
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLon = this.toRad(point2.lng - point1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.lat)) *
        Math.cos(this.toRad(point2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}