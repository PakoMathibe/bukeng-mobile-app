// components/layout/Header.tsx
'use client';

import { Menu, User, Bell } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { usePathname } from 'next/navigation';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

// Map routes to page titles
const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/wallet': 'Wallet',
  '/dashboard/transactions': 'Transactions',
  '/dashboard/repayments': 'Repayments',
  '/dashboard/orders': 'Orders',
  '/dashboard/merchants': 'Merchants',
  '/dashboard/profile': 'Profile',
  '/dashboard/settings': 'Settings',
  '/dashboard/help': 'Help & Support',
  '/dashboard/checkout': 'Checkout',
  '/dashboard/map': 'Find Stores',
};

export function Header({ onMenuClick, title }: HeaderProps) {
  const { user } = useAuthStore();
  const pathname = usePathname();

  // Use provided title or derive from route
  const displayTitle = title || routeTitles[pathname] || 'Bukeng';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-gray-100">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
          aria-label="Open menu"
        >
          <Menu size={24} className="text-gray-700" />
        </button>

        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold text-gray-900">{displayTitle}</h1>
        </div>

        <Link
          href="/dashboard/profile"
          className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
          aria-label="Profile"
        >
          <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center">
            <User size={14} className="text-teal-600" />
          </div>
        </Link>
      </div>
    </header>
  );
}