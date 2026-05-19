// domains/merchants/merchantService.ts
import { supabase } from '@/services/supabase/client';
import { Merchant, MerchantRating, NearbyMerchantResponse, GeoLocation } from '@/types/merchant';
import { mapToMerchant, mapToMerchantRating } from '@/services/supabase/merchantMapper';

export class MerchantService {
  /**
   * Get all active merchants
   */
  static async getAllMerchants(): Promise<Merchant[]> {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('status', 'active')
      .order('rating', { ascending: false });

    if (error) {
      console.error('Failed to fetch all merchants:', error);
      return [];
    }

    return (data || []).map(mapToMerchant);
  }

  /**
   * Get nearby merchants within radius (using latitude/longitude columns)
   */
  static async getNearbyMerchants(
    location: GeoLocation,
    radius: number = 5
  ): Promise<NearbyMerchantResponse> {
    // Calculate bounding box - using latitude/longitude columns
    const latDelta = radius / 111;
    const lngDelta = radius / (111 * Math.cos(location.lat * Math.PI / 180));
    
    const { data: merchants, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('status', 'active')
      .gte('latitude', location.lat - latDelta)  // Changed from 'lat' to 'latitude'
      .lte('latitude', location.lat + latDelta)  // Changed from 'lat' to 'latitude'
      .gte('longitude', location.lng - lngDelta) // Changed from 'lng' to 'longitude'
      .lte('longitude', location.lng + lngDelta) // Changed from 'lng' to 'longitude'
      .order('rating', { ascending: false });
    
    if (error) {
      console.error('Failed to fetch nearby merchants:', error);
      throw new Error('Failed to fetch merchants');
    }
    
    // Calculate distances and map to camelCase
    const merchantsWithDistance = (merchants || [])
      .map(merchant => ({
        ...mapToMerchant(merchant),
        distance: this.calculateDistance(
          location.lat,
          location.lng,
          merchant.latitude,  // Changed from merchant.lat to merchant.latitude
          merchant.longitude  // Changed from merchant.lng to merchant.longitude
        ),
      }))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    
    return {
      merchants: merchantsWithDistance,
      total: merchantsWithDistance.length,
      location,
      radius,
    };
  }
  
  /**
   * Get merchant by ID
   */
  static async getMerchantById(id: string): Promise<Merchant | null> {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Failed to fetch merchant:', error);
      throw new Error('Failed to fetch merchant');
    }
    
    return data ? mapToMerchant(data) : null;
  }
  
  /**
   * Search merchants by name with optional location filter
   */
  static async searchMerchants(
    query: string,
    location?: GeoLocation,
    radius?: number
  ): Promise<Merchant[]> {
    let supabaseQuery = supabase
      .from('merchants')
      .select('*')
      .eq('status', 'active')
      .ilike('name', `%${query}%`);
    
    if (location && radius) {
      const latDelta = radius / 111;
      const lngDelta = radius / (111 * Math.cos(location.lat * Math.PI / 180));
      supabaseQuery = supabaseQuery
        .gte('latitude', location.lat - latDelta)
        .lte('latitude', location.lat + latDelta)
        .gte('longitude', location.lng - lngDelta)
        .lte('longitude', location.lng + lngDelta);
    }
    
    const { data, error } = await supabaseQuery;
    
    if (error) {
      console.error('Failed to search merchants:', error);
      return [];
    }
    
    let merchants = (data || []).map(mapToMerchant);
    
    // Calculate distances if location provided
    if (location) {
      merchants = merchants.map(merchant => ({
        ...merchant,
        distance: this.calculateDistance(
          location.lat,
          location.lng,
          merchant.location.lat,
          merchant.location.lng
        ),
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }
    
    return merchants;
  }
  
  /**
   * Get merchants by type/category
   */
  static async getMerchantsByType(
    businessType: string,
    location?: GeoLocation,
    radius?: number
  ): Promise<Merchant[]> {
    let supabaseQuery = supabase
      .from('merchants')
      .select('*')
      .eq('status', 'active')
      .eq('business_type', businessType);
    
    if (location && radius) {
      const latDelta = radius / 111;
      const lngDelta = radius / (111 * Math.cos(location.lat * Math.PI / 180));
      supabaseQuery = supabaseQuery
        .gte('latitude', location.lat - latDelta)
        .lte('latitude', location.lat + latDelta)
        .gte('longitude', location.lng - lngDelta)
        .lte('longitude', location.lng + lngDelta);
    }
    
    const { data, error } = await supabaseQuery;
    
    if (error) {
      console.error('Failed to fetch merchants by type:', error);
      return [];
    }
    
    let merchants = (data || []).map(mapToMerchant);
    
    if (location) {
      merchants = merchants.map(merchant => ({
        ...merchant,
        distance: this.calculateDistance(
          location.lat,
          location.lng,
          merchant.location.lat,
          merchant.location.lng
        ),
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }
    
    return merchants;
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
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    // Check if user already rated this merchant
    const { data: existing, error: checkError } = await supabase
      .from('merchant_ratings')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (checkError) {
      console.error('Failed to check existing rating:', checkError);
    }
    
    if (existing) {
      throw new Error('You have already rated this merchant');
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
      .maybeSingle();
    
    if (error) {
      console.error('Failed to submit rating:', error);
      throw new Error('Failed to submit rating');
    }
    
    // Update merchant average rating (non-blocking)
    this.updateMerchantAverageRating(merchantId).catch(err => {
      console.error('Failed to update merchant average rating:', err);
    });
    
    return mapToMerchantRating(data);
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
      console.error('Failed to fetch ratings for average:', error);
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
   * Get all ratings for a merchant
   */
  static async getMerchantRatings(merchantId: string): Promise<MerchantRating[]> {
    const { data, error } = await supabase
      .from('merchant_ratings')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Failed to fetch merchant ratings:', error);
      return [];
    }
    
    return (data || []).map(mapToMerchantRating);
  }
  
  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}