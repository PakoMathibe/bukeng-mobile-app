// domains/merchants/merchantService.ts
import {
  Merchant,
  MerchantRating,
  GeoLocation,
  MerchantType,
} from '@/types/merchant';
import { AppError, NotFoundError } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';

// Mock merchant database
const merchantDatabase: Map<string, Merchant> = new Map();
const merchantRatings: Map<string, MerchantRating[]> = new Map();

// Initialize with mock data
const mockMerchants: Merchant[] = [
  {
    id: '1',
    name: 'SPAR Killarney',
    businessType: 'grocery',
    registrationNumber: '2005/123456/07',
    vatNumber: '4123456789',
    address: '33 Killarney Mall, Johannesburg, 2193',
    location: {
      lat: -26.145,
      lng: 28.045,
      formattedAddress: '33 Killarney Mall, Johannesburg',
      placeId: 'place_1',
    },
    contactEmail: 'kilpark@spar.co.za',
    contactPhone: '0111234567',
    website: 'www.spar.co.za',
    logoUrl: null,
    coverImageUrl: null,
    rating: 4.5,
    reviewCount: 128,
    status: 'active',
    operatingHours: {
      monday: { open: '07:00', close: '20:00', isOpen: true },
      tuesday: { open: '07:00', close: '20:00', isOpen: true },
      wednesday: { open: '07:00', close: '20:00', isOpen: true },
      thursday: { open: '07:00', close: '20:00', isOpen: true },
      friday: { open: '07:00', close: '21:00', isOpen: true },
      saturday: { open: '07:00', close: '21:00', isOpen: true },
      sunday: { open: '08:00', close: '18:00', isOpen: true },
      publicHolidays: { open: '09:00', close: '17:00', isOpen: true },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Checkers Rosebank',
    businessType: 'grocery',
    registrationNumber: '1998/789012/07',
    vatNumber: '4987654321',
    address: 'The Zone, Rosebank, Johannesburg, 2196',
    location: {
      lat: -26.14,
      lng: 28.045,
      formattedAddress: 'The Zone, Rosebank, Johannesburg',
      placeId: 'place_2',
    },
    contactEmail: 'rosebank@checkers.co.za',
    contactPhone: '0117654321',
    website: 'www.checkers.co.za',
    logoUrl: null,
    coverImageUrl: null,
    rating: 4.3,
    reviewCount: 95,
    status: 'active',
    operatingHours: {
      monday: { open: '08:00', close: '21:00', isOpen: true },
      tuesday: { open: '08:00', close: '21:00', isOpen: true },
      wednesday: { open: '08:00', close: '21:00', isOpen: true },
      thursday: { open: '08:00', close: '21:00', isOpen: true },
      friday: { open: '08:00', close: '21:00', isOpen: true },
      saturday: { open: '08:00', close: '21:00', isOpen: true },
      sunday: { open: '09:00', close: '18:00', isOpen: true },
      publicHolidays: { open: '09:00', close: '17:00', isOpen: true },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

mockMerchants.forEach((m) => merchantDatabase.set(m.id, m));

export class MerchantService {
  static async getMerchantById(id: string): Promise<Merchant> {
    try {
      const merchant = merchantDatabase.get(id);

      if (!merchant) {
        throw new NotFoundError(`Merchant ${id}`);
      }

      return merchant;
    } catch (error) {
      logger.error('Failed to get merchant', error);
      throw error;
    }
  }

  static async getNearbyMerchants(
    location: GeoLocation,
    radius: number = 5,
    type?: MerchantType
  ): Promise<Merchant[]> {
    try {
      let merchants = Array.from(merchantDatabase.values()).filter(
        (m) => m.status === 'active'
      );

      // Filter by type
      if (type) {
        merchants = merchants.filter((m) => m.businessType === type);
      }

      // Calculate distance (simplified - in production use proper geospatial query)
      merchants = merchants
        .map((m) => ({
          ...m,
          distance: this.calculateDistance(location, m.location),
        }))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));

      // Filter by radius
      merchants = merchants.filter((m) => (m.distance || 0) <= radius);

      return merchants;
    } catch (error) {
      logger.error('Failed to get nearby merchants', error);
      throw error;
    }
  }

  static async searchMerchants(
    query: string,
    location?: GeoLocation
  ): Promise<Merchant[]> {
    try {
      let merchants = Array.from(merchantDatabase.values()).filter(
        (m) => m.status === 'active'
      );

      // Search by name or address
      const searchLower = query.toLowerCase();
      merchants = merchants.filter(
        (m) =>
          m.name.toLowerCase().includes(searchLower) ||
          m.address.toLowerCase().includes(searchLower)
      );

      // Sort by distance if location provided
      if (location) {
        merchants = merchants
          .map((m) => ({
            ...m,
            distance: this.calculateDistance(location, m.location),
          }))
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }

      return merchants;
    } catch (error) {
      logger.error('Failed to search merchants', error);
      throw error;
    }
  }

  static async getMerchantRatings(
    merchantId: string
  ): Promise<MerchantRating[]> {
    try {
      return merchantRatings.get(merchantId) || [];
    } catch (error) {
      logger.error('Failed to get merchant ratings', error);
      throw error;
    }
  }

  static async submitRating(
    merchantId: string,
    userId: string,
    rating: number,
    comment?: string
  ): Promise<MerchantRating> {
    try {
      const merchant = await this.getMerchantById(merchantId);

      if (rating < 1 || rating > 5) {
        throw new AppError(
          'Rating must be between 1 and 5',
          'INVALID_RATING',
          400
        );
      }

      const newRating: MerchantRating = {
        id: `rating_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 9)}`,
        merchantId,
        userId,
        rating,
        comment: comment || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        helpful: 0,
        reported: false,
      };

      const existing = merchantRatings.get(merchantId) || [];
      merchantRatings.set(merchantId, [...existing, newRating]);

      // Update merchant average rating
      const allRatings = merchantRatings.get(merchantId) || [];
      const average =
        allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

      merchant.rating = Number(average.toFixed(1));
      merchant.reviewCount = allRatings.length;
      merchantDatabase.set(merchantId, merchant);

      logger.info(
        `Rating submitted for merchant ${merchantId} by user ${userId}`
      );

      return newRating;
    } catch (error) {
      logger.error('Failed to submit rating', error);
      throw error;
    }
  }

  private static calculateDistance(
    point1: GeoLocation,
    point2: GeoLocation
  ): number {
    const R = 6371; // Earth's radius in km
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
