// domains/merchants/merchantTypes.ts
export interface MerchantFilters {
  type?: MerchantType;
  rating?: number;
  openNow?: boolean;
  maxDistance?: number;
  searchQuery?: string;
}

export interface SearchParams {
  query: string;
  location?: GeoLocation;
  radius?: number;
  filters?: MerchantFilters;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  merchants: Merchant[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface MerchantHours {
  day: string;
  open: string;
  close: string;
  isOpen: boolean;
  isSpecial?: boolean;
}

export interface MerchantDetails extends Merchant {
  distance?: number;
  isOpenNow: boolean;
  hoursToday: MerchantHours | null;
  categories: string[];
  nearbyMerchants?: Merchant[];
}
