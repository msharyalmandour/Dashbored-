import { useEffect, useState } from "react";
import type { ReferralStats } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

const mockStats: ReferralStats = {
  referralCode: "DEMO01",
  referredCount: 2,
  rewardedCount: 1,
  bonusDaysEarned: 15,
};

export function useReferralStats() {
  const { team } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(isSupabaseConfigured ? null : mockStats);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!team) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase!
      .rpc("get_my_referral_stats")
      .single()
      .then(({ data }) => {
        if (data) {
          const row = data as {
            referral_code: string;
            referred_count: number;
            rewarded_count: number;
            bonus_days_earned: number;
          };
          setStats({
            referralCode: row.referral_code,
            referredCount: row.referred_count,
            rewardedCount: row.rewarded_count,
            bonusDaysEarned: row.bonus_days_earned,
          });
        }
        setLoading(false);
      });
  }, [team]);

  return { stats, loading };
}
