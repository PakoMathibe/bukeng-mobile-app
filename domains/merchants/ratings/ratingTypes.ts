// domains/merchants/ratings/ratingTypes.ts
import { MerchantRating } from '@/types/merchant';

export interface RatingStats {
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

export interface RatingResponse {
  success: boolean;
  rating?: MerchantRating;
  error?: string;
}

export interface RatingSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  percentagePositive: number;
  percentageNegative: number;
  starBreakdown: Array<{
    stars: number;
    count: number;
    percentage: number;
  }>;
}