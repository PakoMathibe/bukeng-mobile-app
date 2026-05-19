// app/(dashboard)/merchants/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { MerchantService } from '@/domains/merchants/merchantService';
import { useLocation } from '@/hooks/useLocation';
import {
  Store,
  Star,
  MapPin,
  Clock,
  Search,
  Filter,
  X,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function MerchantsPage() {
  const { user } = useAuthStore();
  const { location, getCurrentLocation } = useLocation();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    loadMerchants();
  }, [location]);

  const loadMerchants = async () => {
    setLoading(true);
    try {
      let merchantsList;
      if (location) {
        const nearby = await MerchantService.getNearbyMerchants(location, 10);
        merchantsList = nearby.merchants;
      } else {
        merchantsList = await MerchantService.getAllMerchants();
      }
      setMerchants(merchantsList);
    } catch (error) {
      console.error('Failed to load merchants:', error);
      toast.error('Failed to load merchants');
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyLocation = async () => {
    try {
      await getCurrentLocation();
      toast.success('Location updated');
    } catch (error) {
      toast.error('Unable to get your location');
    }
  };

  const filteredMerchants = merchants
    .filter((merchant) =>
      merchant.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((merchant) =>
      selectedType === 'all' ? true : merchant.businessType === selectedType
    );

  const businessTypes = [
    { value: 'all', label: 'All' },
    { value: 'grocery', label: 'Groceries' },
    { value: 'restaurant', label: 'Restaurants' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'spaza', label: 'Spaza Shops' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Partner Merchants</h1>
        <button
          onClick={handleUseMyLocation}
          className="flex items-center gap-2 px-4 py-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
        >
          <MapPin size={18} />
          Near Me
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search merchants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl w-full max-w-md animate-slide-up">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
              </label>
              <div className="flex flex-wrap gap-2">
                {businessTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => {
                      setSelectedType(type.value);
                      setShowFilters(false);
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm ${
                      selectedType === type.value
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merchants Grid */}
      {filteredMerchants.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Store className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No merchants found</p>
          <p className="text-sm text-gray-400 mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredMerchants.map((merchant) => (
            <Link key={merchant.id} href={`/dashboard/merchants/${merchant.id}`}>
              <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                    <Store className="w-6 h-6 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {merchant.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium">
                            {merchant.rating}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({merchant.reviewCount} reviews)
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          merchant.open !== false
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {merchant.open !== false ? 'Open' : 'Closed'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin size={14} />
                        <span>{merchant.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock size={14} />
                        <span>{merchant.operatingHours?.monday?.open} - {merchant.operatingHours?.monday?.close}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {merchant.distance?.toFixed(1)} km away
                      </span>
                      <span className="text-teal-600 text-sm font-medium">
                        View Details →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}