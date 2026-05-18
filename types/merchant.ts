// types/merchant.ts
export type MerchantType = 'grocery' | 'restaurant' | 'delivery' | 'spaza';
export type MerchantStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface Merchant {
  id: string;
  name: string;
  businessType: MerchantType;
  registrationNumber: string;
  vatNumber: string | null;
  address: string;
  location: GeoLocation;
  contactEmail: string;
  contactPhone: string;
  website: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  rating: number;
  reviewCount: number;
  status: MerchantStatus;
  operatingHours: OperatingHours;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId: string;
}

export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
  publicHolidays: DayHours;
}

export interface DayHours {
  open: string;
  close: string;
  isOpen: boolean;
}

export interface MerchantRating {
  id: string;
  merchantId: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  helpful: number;
  reported: boolean;
}

export interface NearbyMerchantResponse {
  merchants: Merchant[];
  total: number;
  location: GeoLocation;
  radius: number;
}