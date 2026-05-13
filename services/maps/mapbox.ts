// services/maps/mapbox.ts
export class MapboxService {
  private static accessToken: string | null = null;

  static initialize(accessToken: string) {
    this.accessToken = accessToken;
  }

  static async getStaticMap(
    center: Location,
    zoom: number = 15,
    width: number = 600,
    height: number = 400
  ): Promise<string> {
    // In production, call Mapbox Static API
    await new Promise((resolve) => setTimeout(resolve, 500));

    return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${center.lng},${center.lat},${zoom}/${width}x${height}?access_token=${this.accessToken}`;
  }

  static async geocode(address: string): Promise<Location> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      lat: -26.14,
      lng: 28.04,
      address,
    };
  }

  static async reverseGeocode(location: Location): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return '33 Killarney Mall, Johannesburg';
  }
}
