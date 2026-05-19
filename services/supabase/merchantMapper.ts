// services/supabase/merchantMapper.ts
import { 
    Merchant, 
    GeoLocation, 
    OperatingHours, 
    DayHours, 
    MerchantRating,
    MerchantType,
    MerchantStatus 
  } from '@/types/merchant';
  
  /**
   * Parses operating hours from JSONB with default fallback
   */
  function parseOperatingHours(dbOperatingHours: any): OperatingHours {
    const defaultDay: DayHours = { open: '09:00', close: '17:00', isOpen: true };
    const defaultHours: OperatingHours = {
      monday: defaultDay,
      tuesday: defaultDay,
      wednesday: defaultDay,
      thursday: defaultDay,
      friday: defaultDay,
      saturday: { open: '09:00', close: '15:00', isOpen: true },
      sunday: { open: '09:00', close: '13:00', isOpen: true },
      publicHolidays: { open: '10:00', close: '14:00', isOpen: true },
    };
  
    if (!dbOperatingHours) return defaultHours;
  
    return {
      monday: dbOperatingHours.monday || defaultDay,
      tuesday: dbOperatingHours.tuesday || defaultDay,
      wednesday: dbOperatingHours.wednesday || defaultDay,
      thursday: dbOperatingHours.thursday || defaultDay,
      friday: dbOperatingHours.friday || defaultDay,
      saturday: dbOperatingHours.saturday || defaultDay,
      sunday: dbOperatingHours.sunday || defaultDay,
      publicHolidays: dbOperatingHours.publicHolidays || defaultDay,
    };
  }
  
  /**
   * Converts database merchants record (snake_case) to frontend Merchant type (camelCase)
   * Handles both 'latitude/longitude' and 'lat/lng' column names for compatibility
   */
  export function mapToMerchant(dbRecord: any): Merchant {
    // Support both column naming conventions
    // Try latitude/longitude first (your actual DB schema), then fall back to lat/lng
    const lat = dbRecord.latitude ?? dbRecord.lat ?? 0;
    const lng = dbRecord.longitude ?? dbRecord.lng ?? 0;
    
    const location: GeoLocation = {
      lat,
      lng,
      formattedAddress: dbRecord.formatted_address ?? dbRecord.address ?? '',
      placeId: dbRecord.place_id ?? '',
    };
  
    return {
      id: dbRecord.id,
      name: dbRecord.name,
      businessType: (dbRecord.business_type || dbRecord.category || 'grocery') as MerchantType,
      registrationNumber: dbRecord.registration_number ?? '',
      vatNumber: dbRecord.vat_number ?? null,
      address: dbRecord.address,
      location,
      contactEmail: dbRecord.contact_email ?? '',
      contactPhone: dbRecord.contact_phone ?? '',
      website: dbRecord.website ?? null,
      logoUrl: dbRecord.logo_url ?? null,
      coverImageUrl: dbRecord.cover_image_url ?? null,
      rating: dbRecord.rating ?? 0,
      reviewCount: dbRecord.review_count ?? 0,
      status: (dbRecord.status ?? 'active') as MerchantStatus,
      operatingHours: parseOperatingHours(dbRecord.operating_hours),
      createdAt: new Date(dbRecord.created_at),
      updatedAt: new Date(dbRecord.updated_at || dbRecord.created_at),
    };
  }
  
  /**
   * Converts frontend Merchant type to database record (snake_case) for insert/update
   */
  export function mapToMerchantRecord(merchant: Partial<Merchant>): Record<string, unknown> {
    const record: Record<string, unknown> = {};
  
    if (merchant.id !== undefined) record.id = merchant.id;
    if (merchant.name !== undefined) record.name = merchant.name;
    if (merchant.businessType !== undefined) record.business_type = merchant.businessType;
    if (merchant.registrationNumber !== undefined) record.registration_number = merchant.registrationNumber;
    if (merchant.vatNumber !== undefined) record.vat_number = merchant.vatNumber;
    if (merchant.address !== undefined) record.address = merchant.address;
    if (merchant.location !== undefined) {
      record.latitude = merchant.location.lat;
      record.longitude = merchant.location.lng;
      record.formatted_address = merchant.location.formattedAddress;
      record.place_id = merchant.location.placeId;
    }
    if (merchant.contactEmail !== undefined) record.contact_email = merchant.contactEmail;
    if (merchant.contactPhone !== undefined) record.contact_phone = merchant.contactPhone;
    if (merchant.website !== undefined) record.website = merchant.website;
    if (merchant.logoUrl !== undefined) record.logo_url = merchant.logoUrl;
    if (merchant.coverImageUrl !== undefined) record.cover_image_url = merchant.coverImageUrl;
    if (merchant.rating !== undefined) record.rating = merchant.rating;
    if (merchant.reviewCount !== undefined) record.review_count = merchant.reviewCount;
    if (merchant.status !== undefined) record.status = merchant.status;
    if (merchant.operatingHours !== undefined) record.operating_hours = merchant.operatingHours;
  
    return record;
  }
  
  /**
   * Converts database merchant_ratings record to frontend MerchantRating type
   */
  export function mapToMerchantRating(dbRecord: any): MerchantRating {
    return {
      id: dbRecord.id,
      merchantId: dbRecord.merchant_id,
      userId: dbRecord.user_id,
      rating: dbRecord.rating,
      comment: dbRecord.comment ?? null,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: new Date(dbRecord.updated_at || dbRecord.created_at),
      helpful: dbRecord.helpful ?? 0,
      reported: dbRecord.reported ?? false,
    };
  }
  
  /**
   * Converts frontend MerchantRating to database record for insert
   */
  export function mapToMerchantRatingRecord(rating: Partial<MerchantRating>): Record<string, unknown> {
    const record: Record<string, unknown> = {};
  
    if (rating.id !== undefined) record.id = rating.id;
    if (rating.merchantId !== undefined) record.merchant_id = rating.merchantId;
    if (rating.userId !== undefined) record.user_id = rating.userId;
    if (rating.rating !== undefined) record.rating = rating.rating;
    if (rating.comment !== undefined) record.comment = rating.comment;
    if (rating.helpful !== undefined) record.helpful = rating.helpful;
    if (rating.reported !== undefined) record.reported = rating.reported;
  
    return record;
  }
  
  /**
   * Batch converts multiple database records to frontend Merchant array
   */
  export function mapToMerchantList(dbRecords: any[]): Merchant[] {
    return dbRecords.map(mapToMerchant);
  }
  
  /**
   * Batch converts multiple database records to frontend MerchantRating array
   */
  export function mapToMerchantRatingList(dbRecords: any[]): MerchantRating[] {
    return dbRecords.map(mapToMerchantRating);
  }