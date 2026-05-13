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
  monday: { open: string; close: string; isOpen: boolean };
  tuesday: { open: string; close: string; isOpen: boolean };
  wednesday: { open: string; close: string; isOpen: boolean };
  thursday: { open: string; close: string; isOpen: boolean };
  friday: { open: string; close: string; isOpen: boolean };
  saturday: { open: string; close: string; isOpen: boolean };
  sunday: { open: string; close: string; isOpen: boolean };
  publicHolidays: { open: string; close: string; isOpen: boolean };
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

export interface MerchantCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parentId: string | null;
  merchantCount: number;
}
