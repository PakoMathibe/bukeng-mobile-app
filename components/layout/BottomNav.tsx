// components/layout/BottomNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Store, Wallet, User } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  exactMatch?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home, exactMatch: true },
  { href: '/dashboard/merchants', label: 'Merchants', icon: Store, exactMatch: false },
  { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet, exactMatch: false },
  { href: '/dashboard/profile', label: 'Profile', icon: User, exactMatch: false },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (item: NavItem) => {
    if (item.exactMatch) {
      return pathname === item.href;
    }
    // For non-exact matches, check if pathname starts with the href
    // But prevent /dashboard/merchants from matching /dashboard/wallet
    return pathname.startsWith(item.href) && pathname !== '/dashboard';
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 py-2 px-4 z-40 pb-safe">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[64px] min-h-[48px] px-3 py-1 rounded-xl transition-all duration-200 active:scale-95 ${
                active
                  ? 'text-teal-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon
                size={22}
                className={active ? 'text-teal-600' : 'text-gray-500'}
                strokeWidth={active ? 2 : 1.5}
              />
              <span
                className={`text-xs mt-1 font-medium ${
                  active ? 'text-teal-600' : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}