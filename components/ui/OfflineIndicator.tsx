// components/ui/OfflineIndicator.tsx
'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, pendingSyncCount, isSyncing } = useOnlineStatus();

  if (!isOnline) {
    return (
      <div className="fixed top-16 left-0 right-0 bg-amber-500 text-white py-2 px-4 text-center text-sm z-50">
        <div className="flex items-center justify-center gap-2">
          <WifiOff size={16} />
          <span>You are offline. Changes will sync when connection is restored.</span>
        </div>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="fixed top-16 left-0 right-0 bg-teal-500 text-white py-2 px-4 text-center text-sm z-50">
        <div className="flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          <span>Syncing...</span>
        </div>
      </div>
    );
  }

  if (pendingSyncCount > 0) {
    return (
      <div className="fixed top-16 left-0 right-0 bg-blue-500 text-white py-2 px-4 text-center text-sm z-50">
        <div className="flex items-center justify-center gap-2">
          <Wifi size={16} />
          <span>{pendingSyncCount} item(s) pending sync</span>
        </div>
      </div>
    );
  }

  return null;
}