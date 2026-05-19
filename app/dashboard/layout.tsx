// app/(dashboard)/layout.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SideMenu } from '@/components/layout/SideMenu';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Page titles for the header
const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/merchants': 'Merchants',
  '/dashboard/wallet': 'Wallet',
  '/dashboard/transactions': 'Transactions',
  '/dashboard/repayments': 'Repayments',
  '/dashboard/orders': 'Orders',
  '/dashboard/profile': 'Profile',
  '/dashboard/settings': 'Settings',
  '/dashboard/help': 'Help & Support',
  '/dashboard/checkout': 'Checkout',
  '/dashboard/map': 'Find Stores',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isOnline = useOnlineStatus();
  const { pendingCount, isSyncing } = useOfflineSync();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    } else {
      setIsLoading(false);
    }
  }, [user, router]);

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
    document.cookie = 'bukeng_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    toast.success('Logged out successfully');
    router.push('/auth/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const pageTitle = pageTitles[pathname] || 'Bukeng';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Offline/Online Status Bar */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white py-2 px-4 text-center text-sm z-50">
          <div className="flex items-center justify-center gap-2">
            <WifiOff size={16} />
            <span>Offline Mode - Changes will sync when connection is restored</span>
          </div>
        </div>
      )}
      
      {isOnline && isSyncing && (
        <div className="fixed top-0 left-0 right-0 bg-teal-500 text-white py-2 px-4 text-center text-sm z-50">
          <div className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span>Syncing... ({pendingCount} items remaining)</span>
          </div>
        </div>
      )}
      
      {isOnline && !isSyncing && pendingCount > 0 && (
        <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white py-2 px-4 text-center text-sm z-50">
          <div className="flex items-center justify-center gap-2">
            <Wifi size={16} />
            <span>{pendingCount} item(s) pending sync</span>
          </div>
        </div>
      )}

      <Header onMenuClick={() => setIsMenuOpen(true)} title={pageTitle} />
      
      <SideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onLogout={handleLogout}
      />
      
      <main className={`pb-20 ${!isOnline || isSyncing || pendingCount > 0 ? 'pt-10' : ''}`}>
        <div className="container mx-auto px-4 py-6">
          {children}
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}