// domains/maps/directionsService.ts
import { GeoLocation, RouteInfo } from './mapService';

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
  static async getRoute(
    origin: GeoLocation,
    destination: GeoLocation,
    options: Partial<DirectionsOptions> = {}
  ): Promise<RouteInfo> {
    const { MapService } = await import('./mapService');
    return MapService.getDirections(
      origin,
      destination,
      options.travelMode || 'driving'
    );
  }

  static async getAlternateRoutes(
    origin: GeoLocation,
    destination: GeoLocation,
    count: number = 3
  ): Promise<AlternateRoute[]> {
    const mainRoute = await this.getRoute(origin, destination);

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
          distance: this.calculateMockDifference(mainRoute.distanceValue, 1.2),
          distanceValue: mainRoute.distanceValue * 1.2,
          duration: this.calculateMockDifference(mainRoute.duration, 1.15),
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
          distance: this.calculateMockDifference(mainRoute.distanceValue, 0.9),
          distanceValue: mainRoute.distanceValue * 0.9,
          duration: this.calculateMockDifference(mainRoute.duration, 1.05),
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
  }

  static async getDistanceMatrix(
    origins: GeoLocation[],
    destinations: GeoLocation[]
  ): Promise<Array<Array<{ distance: string; duration: string }>>> {
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
  }

  static async estimateArrivalTime(
    origin: GeoLocation,
    destination: GeoLocation,
    departureTime: Date = new Date()
  ): Promise<{ arrivalTime: Date; duration: number }> {
    const route = await this.getRoute(origin, destination);
    const arrivalTime = new Date(
      departureTime.getTime() + route.durationValue * 1000
    );

    return {
      arrivalTime,
      duration: route.durationValue,
    };
  }

  private static calculateMockDifference(
    value: number | string,
    factor: number
  ): any {
    if (typeof value === 'number') {
      return value * factor;
    }
    // Parse string like "2.5 km" or "10 min"
    const match = value.match(/^([\d.]+)\s+(.+)$/);
    if (match) {
      const num = parseFloat(match[1]) * factor;
      const unit = match[2];
      return `${num.toFixed(1)} ${unit}`;
    }
    return value;
  }
}
