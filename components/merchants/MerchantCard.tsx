'use client';

import Link from 'next/link';

interface Merchant {
  id: string;
  name: string;
  address: string;
  category: string;
  rating: number;
  distance?: string;
}

interface MerchantCardProps {
  merchant: Merchant;
}

export function MerchantCard({ merchant }: MerchantCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 hover:bg-gray-700 transition cursor-pointer">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold">{merchant.name}</h3>
            <span className="bg-yellow-500/20 text-yellow-500 text-xs px-2 py-0.5 rounded-full">
              Bukeng
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">{merchant.address}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-yellow-500 text-xs">
              ⭐ {merchant.rating}
            </span>
            <span className="text-gray-500 text-xs">
              📍 {merchant.distance}
            </span>
            <span className="text-gray-500 text-xs">
              🛒 {merchant.category}
            </span>
          </div>
        </div>
        <Link
          href={`/register?merchant=${merchant.id}`}
          className="bg-yellow-500 text-black px-4 py-2 rounded-lg text-sm font-semibold"
        >
          Pay Here
        </Link>
      </div>
    </div>
  );
}
