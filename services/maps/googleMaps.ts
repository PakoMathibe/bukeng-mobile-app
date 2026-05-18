// services/maps/googleMaps.ts

export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
  placeId: string;
}

export interface PlacePrediction {
  description: string;
  placeId: string;
  mainText?: string;
  secondaryText?: string;
}

export interface MapOptions {
  zoom?: number;
  center?: GeoLocation;
  markers?: GeoLocation[];
}

export class GoogleMapsService {
  private static apiKey: string | null = null;
  private static autocompleteService: google.maps.places.AutocompleteService | null = null;
  private static placesService: google.maps.places.PlacesService | null = null;
  private static isInitialized = false;
  private static initPromise: Promise<void> | null = null;

  /**
   * Initialize Google Maps service with API key
   */
  static initialize(apiKey: string): Promise<void> {
    if (this.isInitialized) {
      return Promise.resolve();
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    if (!apiKey) {
      throw new Error('Google Maps API key is required');
    }

    this.apiKey = apiKey;
    
    this.initPromise = new Promise((resolve, reject) => {
      // Check if already loaded
      if (typeof google !== 'undefined' && google.maps) {
        this.onScriptLoaded();
        resolve();
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector('#google-maps-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          this.onScriptLoaded();
          resolve();
        });
        return;
      }

      // Load script
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        this.onScriptLoaded();
        resolve();
      };
      
      script.onerror = () => {
        this.initPromise = null;
        reject(new Error('Failed to load Google Maps API. Please check your API key and network connection.'));
      };
      
      document.head.appendChild(script);
    });

    return this.initPromise;
  }

  private static onScriptLoaded(): void {
    if (typeof google !== 'undefined' && google.maps) {
      this.autocompleteService = new google.maps.places.AutocompleteService();
      this.isInitialized = true;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Google Maps API loaded successfully');
      }
    }
  }

  /**
   * Ensure services are initialized before use
   */
  private static async ensureInitialized(): Promise<void> {
    if (!this.isInitialized && this.apiKey) {
      await this.initialize(this.apiKey);
    }
    
    if (!this.isInitialized) {
      throw new Error('Google Maps API not initialized. Call initialize() first.');
    }
  }

  /**
   * Search for places by text input
   */
  static async searchPlaces(input: string): Promise<PlacePrediction[]> {
    await this.ensureInitialized();
    
    if (!input || input.length < 2) {
      return [];
    }

    return new Promise((resolve) => {
      if (!this.autocompleteService) {
        resolve([]);
        return;
      }
      
      this.autocompleteService.getPlacePredictions(
        { 
          input, 
          types: ['establishment', 'geocode'],
          componentRestrictions: { country: 'za' }, // Restrict to South Africa
        },
        (predictions, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
            resolve([]);
            return;
          }
          
          resolve(predictions.map(p => ({
            description: p.description,
            placeId: p.place_id,
            mainText: p.structured_formatting?.main_text,
            secondaryText: p.structured_formatting?.secondary_text,
          })));
        }
      );
    });
  }

  /**
   * Get detailed location information from place ID
   */
  static async getPlaceDetails(placeId: string): Promise<GeoLocation | null> {
    await this.ensureInitialized();
    
    if (!placeId) {
      return null;
    }

    return new Promise((resolve) => {
      // Create a temporary div for PlacesService if needed
      if (!this.placesService && typeof google !== 'undefined') {
        const dummyDiv = document.createElement('div');
        this.placesService = new google.maps.places.PlacesService(dummyDiv);
      }
      
      if (!this.placesService) {
        resolve(null);
        return;
      }
      
      this.placesService.getDetails(
        { 
          placeId, 
          fields: ['geometry', 'formatted_address', 'name', 'vicinity'] 
        }, 
        (place, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !place || !place.geometry) {
            resolve(null);
            return;
          }
          
          resolve({
            lat: place.geometry.location!.lat(),
            lng: place.geometry.location!.lng(),
            address: place.formatted_address || place.vicinity || '',
            placeId,
          });
        }
      );
    });
  }

  /**
   * Get static map image URL
   */
  static getStaticMapUrl(
    location: GeoLocation, 
    zoom: number = 15, 
    width: number = 600, 
    height: number = 400,
    markers?: GeoLocation[]
  ): string {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not initialized');
    }

    let url = `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=${zoom}&size=${width}x${height}&key=${this.apiKey}`;
    
    if (markers && markers.length > 0) {
      markers.forEach(marker => {
        url += `&markers=color:red|${marker.lat},${marker.lng}`;
      });
    }
    
    return url;
  }

  /**
   * Get directions URL for navigation
   */
  static getDirectionsUrl(
    origin: GeoLocation | string,
    destination: GeoLocation | string,
    travelMode: 'driving' | 'walking' | 'transit' = 'driving'
  ): string {
    const originStr = typeof origin === 'string' 
      ? encodeURIComponent(origin) 
      : `${origin.lat},${origin.lng}`;
    const destStr = typeof destination === 'string' 
      ? encodeURIComponent(destination) 
      : `${destination.lat},${destination.lng}`;
    
    return `https://www.google.com/maps/dir/${originStr}/${destStr}/data=!4m2!4m1!3e${travelMode === 'walking' ? 2 : travelMode === 'transit' ? 3 : 0}`;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in kilometers
   */
  static calculateDistance(origin: GeoLocation, destination: GeoLocation): number {
    const R = 6371; // Earth's radius in km
    const dLat = (destination.lat - origin.lat) * Math.PI / 180;
    const dLon = (destination.lng - origin.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Check if Google Maps API is loaded
   */
  static isReady(): boolean {
    return this.isInitialized && typeof google !== 'undefined' && google.maps;
  }

  /**
   * Get current user location using browser geolocation
   */
  static async getCurrentLocation(): Promise<GeoLocation | null> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Current Location',
            placeId: 'current',
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
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }
}