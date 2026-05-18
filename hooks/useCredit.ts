// hooks/useCredit.ts
'use client';

import { useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useCreditStore } from '@/store/creditStore';
import { CreditService } from '@/domains/credit/creditService';
import { logger } from '@/lib/logger';

export function useCredit() {
  const { user } = useAuth();
  const { 
    summary, 
    history, 
    loading, 
    error,
    setSummary,
    setHistory,
    setLoading, 
    setError 
  } = useCreditStore();

  const fetchCreditProfile = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const creditProfile = await CreditService.getOrCreateCreditProfile(user.id);
      setSummary(creditProfile);
    } catch (err) {
      logger.error('Failed to fetch credit profile', err);
      setError(err instanceof Error ? err.message : 'Failed to load credit profile');
    } finally {
      setLoading(false);
    }
  }, [user, setLoading, setError, setSummary]);

  const checkAffordability = useCallback(
    async (amount: number) => {
      if (!user) {
        return {
          affordable: false,
          maxAmount: 0,
          reason: 'User not authenticated',
        };
      }
      
      return CreditService.checkAffordability(user.id, amount);
    },
    [user]
  );

  const checkLimitIncrease = useCallback(async () => {
    if (!user) return null;
    return CreditService.checkLimitIncreaseEligibility(user.id);
  }, [user]);

  const applyLimitIncrease = useCallback(async () => {
    if (!user) return null;
    const newProfile = await CreditService.applyLimitIncrease(user.id);
    setSummary(newProfile);
    return newProfile;
  }, [user, setSummary]);

  const updateCreditScore = useCallback(async () => {
    if (!user) return null;
    const newScore = await CreditService.updateCreditScore(user.id);
    if (summary) {
      setSummary({ ...summary, creditScore: newScore });
    }
    return newScore;
  }, [user, summary, setSummary]);

  useEffect(() => {
    fetchCreditProfile();
  }, [fetchCreditProfile]);

  return {
    profile: summary,
    loading,
    error,
    refresh: fetchCreditProfile,
    checkAffordability,
    checkLimitIncrease,
    applyLimitIncrease,
    updateCreditScore,
    availableCredit: summary?.availableCredit || 0,
    creditLimit: summary?.creditLimit || 0,
    creditScore: summary?.creditScore || 500,
    usedCredit: summary?.usedCredit || 0,
    utilizationPercentage: summary?.utilizationPercentage || 0,
  };
}