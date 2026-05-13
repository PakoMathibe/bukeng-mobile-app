// domains/merchants/ratings/ratingService.ts
import { MerchantRating } from '@/types/merchant';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface RatingStats {
  average: number;
  total: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recentRatings: MerchantRating[];
}

const ratingStatsCache: Map<string, RatingStats> = new Map();

export class RatingService {
  static async getRatingStats(merchantId: string): Promise<RatingStats> {
    try {
      const cached = ratingStatsCache.get(merchantId);
      if (cached) return cached;

      const { MerchantService } = await import(
        '@/domains/merchants/merchantService'
      );
      const ratings = await MerchantService.getMerchantRatings(merchantId);

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;

      for (const rating of ratings) {
        distribution[rating.rating as keyof typeof distribution]++;
        sum += rating.rating;
      }

      const stats: RatingStats = {
        average: ratings.length > 0 ? sum / ratings.length : 0,
        total: ratings.length,
        distribution,
        recentRatings: ratings.slice(-10).reverse(),
      };

      ratingStatsCache.set(merchantId, stats);

      return stats;
    } catch (error) {
      logger.error('Failed to get rating stats', error);
      throw error;
    }
  }

  static async canUserRate(
    merchantId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const { MerchantService } = await import(
        '@/domains/merchants/merchantService'
      );
      const ratings = await MerchantService.getMerchantRatings(merchantId);

      // User can only rate once
      return !ratings.some((r) => r.userId === userId);
    } catch (error) {
      logger.error('Failed to check if user can rate', error);
      return true; // Default to true if error
    }
  }

  static async reportRating(
    ratingId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    try {
      const { MerchantService } = await import(
        '@/domains/merchants/merchantService'
      );
      const ratings = await MerchantService.getMerchantRatings(
        ratingId.split('_')[1] || ''
      );

      // Find and report rating
      // In production, store reports in database
      logger.info(`Rating ${ratingId} reported by user ${userId}: ${reason}`);
    } catch (error) {
      logger.error('Failed to report rating', error);
      throw error;
    }
  }

  static async markRatingHelpful(
    ratingId: string,
    userId: string
  ): Promise<void> {
    try {
      // In production, increment helpful count
      logger.info(`Rating ${ratingId} marked helpful by user ${userId}`);
    } catch (error) {
      logger.error('Failed to mark rating helpful', error);
      throw error;
    }
  }
}
