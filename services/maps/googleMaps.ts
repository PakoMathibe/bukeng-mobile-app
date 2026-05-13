// services/maps/googleMaps.ts
export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  location: Location;
  rating?: number;
  photos?: string[];
  types: string[];
}

export class GoogleMapsService {
  private static apiKey: string | null = null;

  static initialize(apiKey: string) {
    this.apiKey = apiKey;
  }

  static async getNearbyPlaces(
    location: Location,
    radius: number = 1000,
    type: string = 'grocery_or_supermarket'
  ): Promise<PlaceResult[]> {
    // In production, call Google Places API
    await new Promise((resolve) => setTimeout(resolve, 500));

    return [
      {
        id: 'place_1',
        name: 'SPAR Killarney',
        address: '33 Killarney Mall, Johannesburg',
        location: { lat: location.lat + 0.01, lng: location.lng + 0.005 },
        rating: 4.5,
        types: ['grocery', 'supermarket'],
      },
    ];
  }

  static async getDirections(
    origin: Location,
    destination: Location
  ): Promise<{
    distance: string;
    duration: string;
    polyline: string;
    steps: string[];
  }> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      distance: '1.2 km',
      duration: '5 mins',
      polyline: 'encoded_polyline_string',
      steps: [
        'Start on Main Road',
        'Turn left on Oxford',
        'Destination on right',
      ],
    };
  }

  static async autocomplete(input: string): Promise<PlaceResult[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return [
      {
        id: 'place_1',
        name: input,
        address: `${input}, Johannesburg`,
        location: { lat: -26.14, lng: 28.04 },
        types: ['grocery'],
      },
    ];
  }
}
