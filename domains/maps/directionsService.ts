// domains/maps/directionsService.ts
import { GeoLocation, RouteInfo, MapService } from './mapService';

export interface DirectionsOptions {
  travelMode: 'driving' | 'walking' | 'transit' | 'bicycling';
  avoidTolls: boolean;
  avoidHighways: boolean;
  language: string;
  units: 'metric' | 'imperial';
}

export interface AlternateRoute {
  id: string;
  route: RouteInfo;
  isRecommended: boolean;
  difference: {
    distance: number;
    duration: number;
  };
}

export class DirectionsService {
  /**
   * Get route between two locations
   */
  static async getRoute(
    origin: GeoLocation,
    destination: GeoLocation,
    options: Partial<DirectionsOptions> = {}
  ): Promise<RouteInfo> {
    try {
      return await MapService.getDirections(
        origin,
        destination,
        options.travelMode || 'driving'
      );
    } catch (error) {
      console.error('DirectionsService.getRoute error:', error);
      throw new Error('Failed to calculate route');
    }
  }

  /**
   * Get alternate routes between two locations
   * Note: In production, this would call a maps API that supports multiple routes
   */
  static async getAlternateRoutes(
    origin: GeoLocation,
    destination: GeoLocation,
    count: number = 3
  ): Promise<AlternateRoute[]> {
    try {
      const mainRoute = await this.getRoute(origin, destination);
      
      // Generate mock alternate routes
      // In production, use real API that provides multiple routes
      const routes: AlternateRoute[] = [
        {
          id: 'route_1',
          route: mainRoute,
          isRecommended: true,
          difference: { distance: 0, duration: 0 },
        },
        {
          id: 'route_2',
          route: {
            ...mainRoute,
            distance: this.formatDistance(mainRoute.distanceValue * 1.2),
            distanceValue: mainRoute.distanceValue * 1.2,
            duration: this.formatDuration(mainRoute.durationValue * 1.15),
            durationValue: mainRoute.durationValue * 1.15,
          },
          isRecommended: false,
          difference: {
            distance: mainRoute.distanceValue * 0.2,
            duration: mainRoute.durationValue * 0.15,
          },
        },
        {
          id: 'route_3',
          route: {
            ...mainRoute,
            distance: this.formatDistance(mainRoute.distanceValue * 0.9),
            distanceValue: mainRoute.distanceValue * 0.9,
            duration: this.formatDuration(mainRoute.durationValue * 1.05),
            durationValue: mainRoute.durationValue * 1.05,
          },
          isRecommended: false,
          difference: {
            distance: -mainRoute.distanceValue * 0.1,
            duration: mainRoute.durationValue * 0.05,
          },
        },
      ];

      return routes.slice(0, count);
    } catch (error) {
      console.error('DirectionsService.getAlternateRoutes error:', error);
      return [];
    }
  }

  /**
   * Get distance matrix for multiple origins and destinations
   */
  static async getDistanceMatrix(
    origins: GeoLocation[],
    destinations: GeoLocation[]
  ): Promise<Array<Array<{ distance: string; duration: string }>>> {
    try {
      const matrix: Array<Array<{ distance: string; duration: string }>> = [];

      for (const origin of origins) {
        const row: Array<{ distance: string; duration: string }> = [];
        for (const destination of destinations) {
          const route = await this.getRoute(origin, destination);
          row.push({
            distance: route.distance,
            duration: route.duration,
          });
        }
        matrix.push(row);
      }

      return matrix;
    } catch (error) {
      console.error('DirectionsService.getDistanceMatrix error:', error);
      return [];
    }
  }

  /**
   * Estimate arrival time based on current route
   */
  static async estimateArrivalTime(
    origin: GeoLocation,
    destination: GeoLocation,
    departureTime: Date = new Date()
  ): Promise<{ arrivalTime: Date; duration: number }> {
    try {
      const route = await this.getRoute(origin, destination);
      const arrivalTime = new Date(
        departureTime.getTime() + route.durationValue * 1000
      );

      return {
        arrivalTime,
        duration: route.durationValue,
      };
    } catch (error) {
      console.error('DirectionsService.estimateArrivalTime error:', error);
      return {
        arrivalTime: departureTime,
        duration: 0,
      };
    }
  }

  /**
   * Format distance from meters to human-readable string
   */
  private static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }

  /**
   * Format duration from seconds to human-readable string
   */
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
}