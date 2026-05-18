// services/maps/googleMaps.ts
export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
  placeId: string;
}

export class GoogleMapsService {
  private static apiKey: string;
  private static autocompleteService: google.maps.places.AutocompleteService | null = null;
  private static placesService: google.maps.places.PlacesService | null = null;

  static initialize(apiKey: string): void {
    this.apiKey = apiKey;
    // Load Google Maps script dynamically
    if (typeof window !== 'undefined' && !document.querySelector('#google-maps-script')) {
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      
      script.onload = () => {
        this.autocompleteService = new google.maps.places.AutocompleteService();
      };
    }
  }

  static async searchPlaces(input: string): Promise<Array<{ description: string; placeId: string }>> {
    if (!this.autocompleteService) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return new Promise((resolve) => {
      if (!this.autocompleteService) {
        resolve([]);
        return;
      }
      
      this.autocompleteService.getPlacePredictions(
        { input, types: ['establishment'] },
        (predictions, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
            resolve([]);
            return;
          }
          resolve(predictions.map(p => ({ description: p.description, placeId: p.place_id })));
        }
      );
    });
  }

  static async getPlaceDetails(placeId: string): Promise<GeoLocation | null> {
    return new Promise((resolve) => {
      if (!this.placesService && typeof google !== 'undefined') {
        const dummyDiv = document.createElement('div');
        this.placesService = new google.maps.places.PlacesService(dummyDiv);
      }
      
      if (!this.placesService) {
        resolve(null);
        return;
      }
      
      this.placesService.getDetails({ placeId, fields: ['geometry', 'formatted_address'] }, (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place || !place.geometry) {
          resolve(null);
          return;
        }
        
        resolve({
          lat: place.geometry.location!.lat(),
          lng: place.geometry.location!.lng(),
          address: place.formatted_address || '',
          placeId,
        });
      });
    });
  }

  static getStaticMapUrl(location: GeoLocation, zoom: number = 15, width: number = 600, height: number = 400): string {
    return `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=${zoom}&size=${width}x${height}&key=${this.apiKey}`;
  }
}