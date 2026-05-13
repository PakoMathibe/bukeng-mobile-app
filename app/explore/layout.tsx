// app/(explore)/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/merchants', label: 'Merchants' },
    { href: '/map', label: 'Map' },
    { href: '/how-it-works', label: 'How It Works' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-teal-600">
              Bukeng
            </Link>
            <div className="flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${
                    pathname === item.href
                      ? 'text-teal-600 font-semibold'
                      : 'text-gray-600 hover:text-teal-600'
                  } transition`}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/login" className="btn-primary py-2 px-4 text-sm">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
