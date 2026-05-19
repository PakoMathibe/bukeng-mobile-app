// hooks/useDashboard.ts
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { CreditService } from '@/domains/credit/creditService';

interface DashboardData {
  tier: number;
  tierName: string;
  totalLimit: number;
  availableCredit: number;
  usedCredit: number;
  utilization: number;
  onTimePayments: number;
  nextUpgradeRequirement: string;
  showBankUploadPrompt: boolean;
  showPaymentPrompt: boolean;
  paymentsNeededForUpgrade: number;
  isLoading: boolean;
  error: string | null;
}

export function useDashboard(): DashboardData {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData>({
    tier: 0,
    tierName: 'Explorer',
    totalLimit: 0,
    availableCredit: 0,
    usedCredit: 0,
    utilization: 0,
    onTimePayments: 0,
    nextUpgradeRequirement: '',
    showBankUploadPrompt: false,
    showPaymentPrompt: false,
    paymentsNeededForUpgrade: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const dashboardData = await CreditService.getDashboardData(user.id);
        setData({ ...dashboardData, isLoading: false, error: null });
      } catch (error) {
        setData(prev => ({ ...prev, isLoading: false, error: 'Failed to load dashboard data' }));
      }
    };

    loadData();
  }, [user]);

  return data;
}