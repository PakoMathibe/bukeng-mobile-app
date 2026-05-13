// hooks/useCredit.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/services/supabase/client';
import { logger } from '@/lib/logger';

interface CreditProfile {
  credit_score: number;
  credit_limit: number;
  available_credit: number;
  risk_level: string;
  updated_at: string;
}

export function useCredit() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CreditProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCreditProfile = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('credit_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (supabaseError && supabaseError.code !== 'PGRST116') {
        throw supabaseError;
      }

      if (data) {
        setProfile(data);
      } else {
        // Create default credit profile
        const defaultProfile = {
          user_id: user.id,
          credit_score: 500,
          credit_limit: 500,
          available_credit: 500,
          risk_level: 'medium',
        };

        const { data: newProfile, error: insertError } = await supabase
          .from('credit_profiles')
          .insert(defaultProfile)
          .select()
          .single();

        if (insertError) throw insertError;

        setProfile(newProfile);
      }
    } catch (err) {
      logger.error('Failed to fetch credit profile', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load credit profile'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  const checkAffordability = useCallback(
    async (
      amount: number
    ): Promise<{
      affordable: boolean;
      maxAmount: number;
      reason?: string;
    }> => {
      if (!profile) {
        return {
          affordable: false,
          maxAmount: 0,
          reason: 'Credit profile not loaded',
        };
      }

      if (amount > (profile.available_credit || 0)) {
        return {
          affordable: false,
          maxAmount: profile.available_credit || 0,
          reason: `Insufficient credit. Available: R${profile.available_credit}`,
        };
      }

      // Check if amount is reasonable based on credit score
      if (profile.credit_score < 600 && amount > 1000) {
        return {
          affordable: false,
          maxAmount: 1000,
          reason: 'Lower credit score limits transaction amount',
        };
      }

      return {
        affordable: true,
        maxAmount: profile.available_credit || 0,
      };
    },
    [profile]
  );

  useEffect(() => {
    fetchCreditProfile();
  }, [fetchCreditProfile]);

  return {
    profile,
    loading,
    error,
    refresh: fetchCreditProfile,
    checkAffordability,
    availableCredit: profile?.available_credit || 0,
    creditLimit: profile?.credit_limit || 0,
    creditScore: profile?.credit_score || 500,
  };
}
