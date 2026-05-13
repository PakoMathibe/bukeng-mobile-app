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

// Mock merchant locations database
const mockMerchantLocations: Map<string, GeoLocation> = new Map([
  [
    '1',
    {
      lat: -26.145,
      lng: 28.045,
      formattedAddress: '33 Killarney Mall, Johannesburg',
      placeId: 'place_1',
    },
  ],
  [
    '2',
    {
      lat: -26.14,
      lng: 28.045,
      formattedAddress: 'The Zone, Rosebank, Johannesburg',
      placeId: 'place_2',
    },
  ],
  [
    '3',
    {
      lat: -26.107,
      lng: 28.054,
      formattedAddress: 'Sandton City, Sandton',
      placeId: 'place_3',
    },
  ],
  [
    '4',
    {
      lat: -26.115,
      lng: 28.048,
      formattedAddress: 'Hyde Park Corner, Hyde Park',
      placeId: 'place_4',
    },
  ],
]);

export class MapService {
  private static googleMapsApiKey: string | null = null;
  private static mapboxToken: string | null = null;
  private static activeProvider: 'google' | 'mapbox' = 'google';

  static initialize(googleApiKey?: string, mapboxToken?: string): void {
    if (googleApiKey) {
      this.googleMapsApiKey = googleApiKey;
    }
    if (mapboxToken) {
      this.mapboxToken = mapboxToken;
    }
    logger.info('Map service initialized', { provider: this.activeProvider });
  }

  static async getNearbyMerchants(
    location: GeoLocation,
    radius: number = 5,
    bounds?: MapBounds
  ): Promise<MapSearchResult> {
    try {
      const { MerchantService } = await import(
        '@/domains/merchants/merchantService'
      );
      let merchants = await MerchantService.getNearbyMerchants(
        location,
        radius
      );

      // Filter by bounds if provided
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

      // Calculate bounds that encompass all merchants
      let calculatedBounds: MapBounds;
      if (merchants.length > 0) {
        calculatedBounds = {
          north: Math.max(...merchants.map((m) => m.location.lat)),
          south: Math.min(...merchants.map((m) => m.location.lat)),
          east: Math.max(...merchants.map((m) => m.location.lng)),
          west: Math.min(...merchants.map((m) => m.location.lng)),
        };
      } else {
        // Default bounds around user location
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

  static async searchLocation(query: string): Promise<GeoLocation[]> {
    try {
      // In production, call Google Maps Geocoding API or Mapbox Geocoding
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock results
      const results: GeoLocation[] = [
        {
          lat: -26.14,
          lng: 28.04,
          formattedAddress: `${query}, Johannesburg, South Africa`,
          placeId: `place_${Date.now()}`,
        },
      ];

      return results;
    } catch (error) {
      logger.error('Failed to search location', error);
      throw error;
    }
  }

  static async getDirections(
    origin: GeoLocation,
    destination: GeoLocation,
    travelMode: 'driving' | 'walking' | 'transit' = 'driving'
  ): Promise<RouteInfo> {
    try {
      // In production, call Directions API
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Calculate straight-line distance for mock
      const distanceValue = this.calculateDistance(origin, destination);
      const durationValue =
        travelMode === 'walking'
          ? distanceValue / 1.4 // walking speed ~1.4 m/s
          : distanceValue / 11.1; // driving speed ~40 km/h

      const distance = this.formatDistance(distanceValue);
      const duration = this.formatDuration(durationValue);

      // Generate mock route steps
      const steps: RouteStep[] = [
        {
          instruction: `Head ${this.getDirection(
            origin,
            this.getMidPoint(origin, destination)
          )} on Main Road`,
          distance: this.formatDistance(distanceValue * 0.3),
          duration: this.formatDuration(durationValue * 0.3),
          startLocation: origin,
          endLocation: this.getMidPoint(origin, destination),
          maneuver: 'straight',
        },
        {
          instruction: `Turn ${
            this.shouldTurnLeft(origin, destination) ? 'left' : 'right'
          } onto Oxford Road`,
          distance: this.formatDistance(distanceValue * 0.4),
          duration: this.formatDuration(durationValue * 0.4),
          startLocation: this.getMidPoint(origin, destination),
          endLocation: this.getMidPoint(
            this.getMidPoint(origin, destination),
            destination
          ),
          maneuver: this.shouldTurnLeft(origin, destination)
            ? 'turn-left'
            : 'turn-right',
        },
        {
          instruction: 'Continue straight to your destination',
          distance: this.formatDistance(distanceValue * 0.3),
          duration: this.formatDuration(durationValue * 0.3),
          startLocation: this.getMidPoint(
            this.getMidPoint(origin, destination),
            destination
          ),
          endLocation: destination,
          maneuver: 'straight',
        },
      ];

      // Add final destination step
      steps.push({
        instruction: 'Arrive at destination',
        distance: '0 m',
        duration: '0 min',
        startLocation: steps[steps.length - 1]?.endLocation || destination,
        endLocation: destination,
        maneuver: 'destination',
      });

      return {
        distance,
        distanceValue,
        duration,
        durationValue,
        steps,
        polyline: this.encodePolyline(origin, destination),
        startLocation: origin,
        endLocation: destination,
      };
    } catch (error) {
      logger.error('Failed to get directions', error);
      throw error;
    }
  }

  static async getStaticMapImage(
    center: GeoLocation,
    zoom: number = 15,
    width: number = 600,
    height: number = 400,
    markers?: GeoLocation[]
  ): Promise<string> {
    try {
      if (this.activeProvider === 'google' && this.googleMapsApiKey) {
        let url = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=${width}x${height}&key=${this.googleMapsApiKey}`;

        if (markers) {
          markers.forEach((marker) => {
            url += `&markers=color:red|${marker.lat},${marker.lng}`;
          });
        }

        return url;
      } else if (this.mapboxToken) {
        let url = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${center.lng},${center.lat},${zoom}/${width}x${height}?access_token=${this.mapboxToken}`;

        if (markers) {
          url += `&marker=pin-s-teal+${markers[0]?.lng},${markers[0]?.lat}`;
        }

        return url;
      }

      // Fallback to placeholder
      return `https://placehold.co/${width}x${height}/e0e0e0/808080?text=Map+View`;
    } catch (error) {
      logger.error('Failed to get static map image', error);
      throw error;
    }
  }

  static async autocomplete(
    input: string
  ): Promise<
    Array<{ description: string; placeId: string; location?: GeoLocation }>
  > {
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (!input || input.length < 2) return [];

      return [
        {
          description: `${input}, Johannesburg, South Africa`,
          placeId: `place_${Date.now()}_1`,
        },
        {
          description: `${input}, Cape Town, South Africa`,
          placeId: `place_${Date.now()}_2`,
        },
        {
          description: `${input}, Durban, South Africa`,
          placeId: `place_${Date.now()}_3`,
        },
      ];
    } catch (error) {
      logger.error('Failed to autocomplete', error);
      return [];
    }
  }

  static async getCurrentLocation(): Promise<GeoLocation> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(
          new AppError(
            'Geolocation not supported',
            'GEOLOCATION_UNSUPPORTED',
            400
          )
        );
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
          reject(new AppError(error.message, 'GEOLOCATION_ERROR', 400));
        }
      );
    });
  }

  static async getAddressFromLocation(location: GeoLocation): Promise<string> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock reverse geocoding
      return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    } catch (error) {
      logger.error('Failed to reverse geocode', error);
      return 'Address not found';
    }
  }

  private static calculateDistance(
    point1: GeoLocation,
    point2: GeoLocation
  ): number {
    const R = 6371000; // Earth's radius in meters
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

  private static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }

  private static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)} sec`;
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hr${hours !== 1 ? 's' : ''} ${remainingMinutes} min`;
  }

  private static getDirection(from: GeoLocation, to: GeoLocation): string {
    const bearing = this.getBearing(from, to);
    if (bearing >= 337.5 || bearing < 22.5) return 'north';
    if (bearing >= 22.5 && bearing < 67.5) return 'northeast';
    if (bearing >= 67.5 && bearing < 112.5) return 'east';
    if (bearing >= 112.5 && bearing < 157.5) return 'southeast';
    if (bearing >= 157.5 && bearing < 202.5) return 'south';
    if (bearing >= 202.5 && bearing < 247.5) return 'southwest';
    if (bearing >= 247.5 && bearing < 292.5) return 'west';
    return 'northwest';
  }

  private static getBearing(from: GeoLocation, to: GeoLocation): number {
    const fromLat = this.toRad(from.lat);
    const fromLng = this.toRad(from.lng);
    const toLat = this.toRad(to.lat);
    const toLng = this.toRad(to.lng);

    const y = Math.sin(toLng - fromLng) * Math.cos(toLat);
    const x =
      Math.cos(fromLat) * Math.sin(toLat) -
      Math.sin(fromLat) * Math.cos(toLat) * Math.cos(toLng - fromLng);

    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    bearing = (bearing + 360) % 360;
    return bearing;
  }

  private static getMidPoint(
    point1: GeoLocation,
    point2: GeoLocation
  ): GeoLocation {
    return {
      lat: (point1.lat + point2.lat) / 2,
      lng: (point1.lng + point2.lng) / 2,
      formattedAddress: 'Midpoint',
      placeId: 'midpoint',
    };
  }

  private static shouldTurnLeft(
    origin: GeoLocation,
    destination: GeoLocation
  ): boolean {
    const bearing = this.getBearing(origin, destination);
    return bearing > 180;
  }

  private static encodePolyline(
    origin: GeoLocation,
    destination: GeoLocation
  ): string {
    // Simplified polyline encoding for mock
    const points = [
      [origin.lat, origin.lng],
      [(origin.lat + destination.lat) / 2, (origin.lng + destination.lng) / 2],
      [destination.lat, destination.lng],
    ];

    return points.map((p) => `${p[0]},${p[1]}`).join('|');
  }
}
