// services/maps/mapbox.ts

export interface MapboxLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface MapboxGeocodeResult {
  locations: MapboxLocation[];
  query: string;
}

export interface MapboxStaticMapOptions {
  width?: number;
  height?: number;
  zoom?: number;
  bearing?: number;
  pitch?: number;
  markers?: MapboxMarker[];
  geojson?: any;
}

export interface MapboxMarker {
  lng: number;
  lat: number;
  color?: string;
  label?: string;
  size?: 'small' | 'medium' | 'large';
}

export class MapboxService {
  private static accessToken: string | null = null;
  private static baseUrl = 'https://api.mapbox.com';
  private static readonly STYLES = {
    streets: 'mapbox/streets-v12',
    light: 'mapbox/light-v11',
    dark: 'mapbox/dark-v11',
    satellite: 'mapbox/satellite-v9',
    outdoors: 'mapbox/outdoors-v12',
  };

  /**
   * Initialize Mapbox service with access token
   */
  static initialize(accessToken: string): void {
    if (!accessToken) {
      throw new Error('Mapbox access token is required');
    }
    this.accessToken = accessToken;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Mapbox service initialized');
    }
  }

  /**
   * Get static map image URL
   */
  static getStaticMap(
    center: MapboxLocation,
    options?: MapboxStaticMapOptions
  ): string {
    if (!this.accessToken) {
      throw new Error('Mapbox not initialized. Call initialize() first.');
    }

    const width = options?.width || 600;
    const height = options?.height || 400;
    const zoom = options?.zoom || 15;
    const bearing = options?.bearing || 0;
    const pitch = options?.pitch || 0;

    let url = `${this.baseUrl}/styles/v1/${this.STYLES.streets}/static`;

    // Add markers if provided
    if (options?.markers && options.markers.length > 0) {
      const markers = options.markers.map(m => {
        let markerStr = `pin-s${m.color ? `+${m.color}` : ''}`;
        if (m.label) markerStr += `+${m.label}`;
        markerStr += `(${m.lng},${m.lat})`;
        return markerStr;
      }).join(',');
      url += `/${markers}`;
    }

    // Add center and zoom
    url += `/${center.lng},${center.lat},${zoom},${bearing},${pitch}/${width}x${height}`;
    url += `?access_token=${this.accessToken}`;
    
    // Add retina support for high-DPI displays
    if (typeof window !== 'undefined' && window.devicePixelRatio >= 2) {
      url += '&@2x';
    }

    return url;
  }

  /**
   * Geocode an address to coordinates
   */
  static async geocode(address: string): Promise<MapboxGeocodeResult> {
    if (!this.accessToken) {
      throw new Error('Mapbox not initialized. Call initialize() first.');
    }

    if (!address || address.trim().length === 0) {
      throw new Error('Address is required for geocoding');
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${this.accessToken}&country=za&limit=5`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      const locations: MapboxLocation[] = data.features.map((feature: any) => ({
        lat: feature.center[1],
        lng: feature.center[0],
        address: feature.place_name,
      }));

      return {
        locations,
        query: address,
      };
    } catch (error) {
      console.error('Mapbox geocoding error:', error);
      throw new Error(`Geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  static async reverseGeocode(location: MapboxLocation): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Mapbox not initialized. Call initialize() first.');
    }

    const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${location.lng},${location.lat}.json?access_token=${this.accessToken}&country=za&types=address,poi`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
      
      return 'Address not found';
    } catch (error) {
      console.error('Mapbox reverse geocoding error:', error);
      throw new Error(`Reverse geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get directions between two points
   */
  static async getDirections(
    origin: MapboxLocation,
    destination: MapboxLocation,
    profile: 'driving' | 'walking' | 'cycling' = 'driving'
  ): Promise<{
    distance: number;
    duration: number;
    geometry: string;
    steps: Array<{
      instruction: string;
      distance: number;
      duration: number;
    }>;
  }> {
    if (!this.accessToken) {
      throw new Error('Mapbox not initialized. Call initialize() first.');
    }

    const profileMap = {
      driving: 'driving',
      walking: 'walking',
      cycling: 'cycling',
    };

    const url = `${this.baseUrl}/directions/v5/mapbox/${profileMap[profile]}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=polyline&steps=true&access_token=${this.accessToken}&language=en`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Directions API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.routes || data.routes.length === 0) {
        throw new Error('No route found');
      }

      const route = data.routes[0];
      const leg = route.legs[0];

      return {
        distance: route.distance / 1000, // Convert to km
        duration: route.duration / 60,   // Convert to minutes
        geometry: route.geometry,
        steps: leg.steps.map((step: any) => ({
          instruction: step.maneuver.instruction,
          distance: step.distance,
          duration: step.duration,
        })),
      };
    } catch (error) {
      console.error('Mapbox directions error:', error);
      throw new Error(`Directions failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get distance matrix for multiple origins and destinations
   */
  static async getDistanceMatrix(
    origins: MapboxLocation[],
    destinations: MapboxLocation[],
    profile: 'driving' | 'walking' | 'cycling' = 'driving'
  ): Promise<{
    durations: number[][];
    distances: number[][];
  }> {
    if (!this.accessToken) {
      throw new Error('Mapbox not initialized. Call initialize() first.');
    }

    const profileMap = {
      driving: 'driving',
      walking: 'walking',
      cycling: 'cycling',
    };

    const originStr = origins.map(o => `${o.lng},${o.lat}`).join(';');
    const destStr = destinations.map(d => `${d.lng},${d.lat}`).join(';');

    const url = `${this.baseUrl}/directions-matrix/v1/mapbox/${profileMap[profile]}/${originStr}/${destStr}?annotations=distance,duration&access_token=${this.accessToken}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Distance matrix API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        distances: data.distances || [],
        durations: data.durations || [],
      };
    } catch (error) {
      console.error('Mapbox distance matrix error:', error);
      throw new Error(`Distance matrix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get suggestions for autocomplete search
   */
  static async autocomplete(input: string, proximity?: MapboxLocation): Promise<MapboxLocation[]> {
    if (!this.accessToken) {
      throw new Error('Mapbox not initialized. Call initialize() first.');
    }

    if (!input || input.length < 2) {
      return [];
    }

    const encodedInput = encodeURIComponent(input);
    let url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodedInput}.json?access_token=${this.accessToken}&country=za&limit=5&types=address,poi,locality`;

    if (proximity) {
      url += `&proximity=${proximity.lng},${proximity.lat}`;
    }

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Autocomplete failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.features.map((feature: any) => ({
        lat: feature.center[1],
        lng: feature.center[0],
        address: feature.place_name,
      }));
    } catch (error) {
      console.error('Mapbox autocomplete error:', error);
      return [];
    }
  }
}