// domains/merchants/ratings/ratingService.ts
import { supabase } from '@/services/supabase/client';
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

interface RatingReport {
  id: string;
  ratingId: string;
  userId: string;
  reason: string;
  createdAt: Date;
  status: 'pending' | 'reviewed' | 'dismissed';
}

const ratingStatsCache: Map<string, { stats: RatingStats; cachedAt: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class RatingService {
  /**
   * Get rating statistics for a merchant with caching
   */
  static async getRatingStats(merchantId: string): Promise<RatingStats> {
    try {
      // Check cache
      const cached = ratingStatsCache.get(merchantId);
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return cached.stats;
      }

      // Fetch ratings from database
      const { data: ratings, error } = await supabase
        .from('merchant_ratings')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch ratings:', error);
        throw new AppError('Failed to fetch ratings', 'RATING_FETCH_ERROR', 500);
      }

      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;

      for (const rating of ratings || []) {
        const starRating = rating.rating as 1 | 2 | 3 | 4 | 5;
        distribution[starRating]++;
        sum += starRating;
      }

      const stats: RatingStats = {
        average: (ratings?.length || 0) > 0 ? sum / (ratings?.length || 1) : 0,
        total: ratings?.length || 0,
        distribution,
        recentRatings: (ratings || []).slice(0, 10).map(mapToMerchantRating),
      };

      // Update cache
      ratingStatsCache.set(merchantId, { stats, cachedAt: Date.now() });

      return stats;
    } catch (error) {
      logger.error('Failed to get rating stats', error);
      throw error;
    }
  }

  /**
   * Submit a rating for a merchant
   */
  static async submitRating(
    merchantId: string,
    userId: string,
    rating: number,
    comment?: string
  ): Promise<MerchantRating> {
    try {
      // Validate rating range
      if (rating < 1 || rating > 5) {
        throw new AppError('Rating must be between 1 and 5', 'INVALID_RATING', 400);
      }

      // Check if user already rated
      const canRate = await this.canUserRate(merchantId, userId);
      if (!canRate) {
        throw new AppError('You have already rated this merchant', 'ALREADY_RATED', 400);
      }

      // Insert rating
      const { data, error } = await supabase
        .from('merchant_ratings')
        .insert({
          merchant_id: merchantId,
          user_id: userId,
          rating,
          comment: comment || null,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to submit rating:', error);
        throw new AppError('Failed to submit rating', 'RATING_SUBMIT_ERROR', 500);
      }

      // Invalidate cache
      ratingStatsCache.delete(merchantId);

      // Update merchant average rating
      await this.updateMerchantAverageRating(merchantId);

      return mapToMerchantRating(data);
    } catch (error) {
      logger.error('Failed to submit rating', error);
      throw error;
    }
  }

  /**
   * Update merchant's average rating and review count
   */
  private static async updateMerchantAverageRating(merchantId: string): Promise<void> {
    const { data: ratings, error } = await supabase
      .from('merchant_ratings')
      .select('rating')
      .eq('merchant_id', merchantId);

    if (error) {
      logger.error('Failed to fetch ratings for average:', error);
      return;
    }

    if (!ratings || ratings.length === 0) return;

    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / ratings.length;

    await supabase
      .from('merchants')
      .update({
        rating: Math.round(average * 10) / 10,
        review_count: ratings.length,
      })
      .eq('id', merchantId);
  }

  /**
   * Check if a user can rate a merchant (only once)
   */
  static async canUserRate(merchantId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('merchant_ratings')
        .select('id')
        .eq('merchant_id', merchantId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        logger.error('Failed to check user rating:', error);
        return true; // Default to true on error
      }

      return !data;
    } catch (error) {
      logger.error('Failed to check if user can rate', error);
      return true;
    }
  }

  /**
   * Report a rating for moderation
   */
  static async reportRating(
    ratingId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    try {
      // First, check if rating exists
      const { data: rating, error: fetchError } = await supabase
        .from('merchant_ratings')
        .select('id')
        .eq('id', ratingId)
        .single();

      if (fetchError || !rating) {
        throw new AppError('Rating not found', 'RATING_NOT_FOUND', 404);
      }

      // Insert report
      const { error: insertError } = await supabase
        .from('rating_reports')
        .insert({
          rating_id: ratingId,
          user_id: userId,
          reason,
          status: 'pending',
        });

      if (insertError) {
        logger.error('Failed to report rating:', insertError);
        throw new AppError('Failed to report rating', 'REPORT_ERROR', 500);
      }

      // Mark rating as reported
      await supabase
        .from('merchant_ratings')
        .update({ reported: true })
        .eq('id', ratingId);

      logger.info(`Rating ${ratingId} reported by user ${userId}: ${reason}`);
    } catch (error) {
      logger.error('Failed to report rating', error);
      throw error;
    }
  }

  /**
   * Mark a rating as helpful
   */
  static async markRatingHelpful(ratingId: string, userId: string): Promise<void> {
    try {
      // Check if user already marked this rating as helpful
      const { data: existing, error: checkError } = await supabase
        .from('rating_helpful_votes')
        .select('id')
        .eq('rating_id', ratingId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        logger.error('Failed to check helpful vote:', checkError);
      }

      if (existing) {
        // Already voted
        return;
      }

      // Insert helpful vote
      const { error: insertError } = await supabase
        .from('rating_helpful_votes')
        .insert({
          rating_id: ratingId,
          user_id: userId,
        });

      if (insertError) {
        logger.error('Failed to mark rating helpful:', insertError);
        throw new AppError('Failed to mark rating helpful', 'HELPFUL_ERROR', 500);
      }

      // Increment helpful count on rating
      await supabase.rpc('increment_rating_helpful', { rating_id: ratingId });

      logger.info(`Rating ${ratingId} marked helpful by user ${userId}`);
    } catch (error) {
      logger.error('Failed to mark rating helpful', error);
      throw error;
    }
  }

  /**
   * Get a user's rating for a merchant (if exists)
   */
  static async getUserRating(merchantId: string, userId: string): Promise<MerchantRating | null> {
    try {
      const { data, error } = await supabase
        .from('merchant_ratings')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        logger.error('Failed to get user rating:', error);
        return null;
      }

      return data ? mapToMerchantRating(data) : null;
    } catch (error) {
      logger.error('Failed to get user rating', error);
      return null;
    }
  }

  /**
   * Delete a rating (admin or user self-delete)
   */
  static async deleteRating(ratingId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    try {
      // Check ownership
      if (!isAdmin) {
        const { data: rating, error } = await supabase
          .from('merchant_ratings')
          .select('user_id')
          .eq('id', ratingId)
          .single();

        if (error || !rating) {
          throw new AppError('Rating not found', 'RATING_NOT_FOUND', 404);
        }

        if (rating.user_id !== userId) {
          throw new AppError('Not authorized to delete this rating', 'UNAUTHORIZED', 403);
        }
      }

      // Delete the rating
      const { error } = await supabase
        .from('merchant_ratings')
        .delete()
        .eq('id', ratingId);

      if (error) {
        logger.error('Failed to delete rating:', error);
        throw new AppError('Failed to delete rating', 'DELETE_ERROR', 500);
      }

      // Invalidate cache
      // Extract merchantId from rating (would need to fetch first)
      ratingStatsCache.clear(); // Simple: clear all cache

      logger.info(`Rating ${ratingId} deleted by user ${userId}`);
    } catch (error) {
      logger.error('Failed to delete rating', error);
      throw error;
    }
  }

  /**
   * Clear cache for a merchant (useful after updates)
   */
  static invalidateCache(merchantId: string): void {
    ratingStatsCache.delete(merchantId);
  }

  /**
   * Clear entire cache
   */
  static clearCache(): void {
    ratingStatsCache.clear();
  }
}

/**
 * Map database record to MerchantRating type
 */
function mapToMerchantRating(dbRecord: any): MerchantRating {
  return {
    id: dbRecord.id,
    merchantId: dbRecord.merchant_id,
    userId: dbRecord.user_id,
    rating: dbRecord.rating,
    comment: dbRecord.comment,
    createdAt: new Date(dbRecord.created_at),
    updatedAt: new Date(dbRecord.updated_at || dbRecord.created_at),
    helpful: dbRecord.helpful || 0,
    reported: dbRecord.reported || false,
  };
}