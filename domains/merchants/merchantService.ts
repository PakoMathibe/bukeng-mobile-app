// domains/merchants/merchantService.ts
import { supabase } from '@/services/supabase/client';
import { Merchant, MerchantRating, NearbyMerchantResponse, GeoLocation } from '@/types/merchant';
import { GoogleMapsService } from '@/services/maps/googleMaps';

export class MerchantService {
  static async getNearbyMerchants(
    location: GeoLocation,
    radius: number = 5
  ): Promise<NearbyMerchantResponse> {
    // Use PostGIS or simple bounding box for nearby search
    const latDelta = radius / 111;
    const lngDelta = radius / (111 * Math.cos(location.lat * Math.PI / 180));
    
    const { data: merchants, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('status', 'active')
      .gte('lat', location.lat - latDelta)
      .lte('lat', location.lat + latDelta)
      .gte('lng', location.lng - lngDelta)
      .lte('lng', location.lng + lngDelta)
      .order('rating', { ascending: false });
    
    if (error) throw new Error(error.message);
    
    // Calculate distances
    const merchantsWithDistance = (merchants || []).map(merchant => ({
      ...merchant,
      distance: this.calculateDistance(
        location.lat,
        location.lng,
        merchant.lat,
        merchant.lng
      ),
    })).sort((a, b) => a.distance - b.distance);
    
    return {
      merchants: merchantsWithDistance,
      total: merchantsWithDistance.length,
      location,
      radius,
    };
  }
  
  static async getMerchantById(id: string): Promise<Merchant | null> {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  }
  
  static async searchMerchants(query: string, location?: GeoLocation): Promise<Merchant[]> {
    let supabaseQuery = supabase
      .from('merchants')
      .select('*')
      .eq('status', 'active')
      .ilike('name', `%${query}%`);
    
    if (location) {
      const latDelta = 5 / 111;
      const lngDelta = 5 / (111 * Math.cos(location.lat * Math.PI / 180));
      supabaseQuery = supabaseQuery
        .gte('lat', location.lat - latDelta)
        .lte('lat', location.lat + latDelta)
        .gte('lng', location.lng - lngDelta)
        .lte('lng', location.lng + lngDelta);
    }
    
    const { data, error } = await supabaseQuery;
    
    if (error) return [];
    
    return data || [];
  }
  
  static async submitRating(
    merchantId: string,
    userId: string,
    rating: number,
    comment?: string
  ): Promise<MerchantRating> {
    const { data, error } = await supabase
      .from('merchant_ratings')
      .insert({
        merchant_id: merchantId,
        user_id: userId,
        rating,
        comment,
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    // Update merchant average rating
    const { data: ratings } = await supabase
      .from('merchant_ratings')
      .select('rating')
      .eq('merchant_id', merchantId);
    
    if (ratings && ratings.length > 0) {
      const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      await supabase
        .from('merchants')
        .update({ rating: avgRating, review_count: ratings.length })
        .eq('id', merchantId);
    }
    
    return data;
  }
  
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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