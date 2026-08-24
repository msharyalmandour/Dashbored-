import { useEffect, useState } from "react";
import type { Team } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const mockTeams: Team[] = [
  {
    id: "team-delirium",
    name: "فريق دليريوم — سارة العتيبي",
    subscriptionEndDate: "2030-01-01",
    memberCount: 5,
    monthlyPrice: 25,
    isFounder: true,
  },
  {
    id: "team-trials",
    name: "فريق تجارب — نورة القحطاني",
    subscriptionEndDate: fromToday(4),
    memberCount: 4,
    monthlyPrice: 25,
    isFounder: true,
  },
  {
    id: "team-safety",
    name: "فريق سلامة المريض — بندر العتيبي",
    subscriptionEndDate: fromToday(-10),
    memberCount: 6,
    monthlyPrice: 25,
    isFounder: false,
  },
  {
    id: "team-community",
    name: "فريق التمريض المجتمعي — ريم الدوسري",
    subscriptionEndDate: null,
    memberCount: 3,
    monthlyPrice: 25,
    isFounder: false,
  },
];

function fromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function extendDate(current: string | null, months: number): string {
  const base = current && new Date(current) > new Date() ? new Date(current) : new Date();
  base.setMonth(base.getMonth() + months);
  return base.toISOString().slice(0, 10);
}

interface AdminTeamRow {
  id: string;
  name: string;
  subscription_end_date: string | null;
  member_count: number;
  monthly_price: number;
  is_founder: boolean;
}

export function useAdminTeams() {
  const [teams, setTeams] = useState<Team[]>(isSupabaseConfigured ? [] : mockTeams);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const load = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    const { data } = await supabase!.rpc("admin_list_teams");
    if (data) {
      setTeams(
        (data as AdminTeamRow[]).map((row) => ({
          id: row.id,
          name: row.name,
          subscriptionEndDate: row.subscription_end_date,
          memberCount: Number(row.member_count),
          monthlyPrice: Number(row.monthly_price),
          isFounder: row.is_founder,
        })),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extendSubscription = async (teamId: string, months: number) => {
    if (!isSupabaseConfigured) {
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? { ...t, subscriptionEndDate: extendDate(t.subscriptionEndDate, months) }
            : t,
        ),
      );
      return { error: undefined as string | undefined };
    }
    const { error } = await supabase!.rpc("admin_extend_subscription", {
      target_team_id: teamId,
      months,
    });
    if (!error) await load();
    return { error: error?.message };
  };

  return { teams, loading, extendSubscription, refresh: load };
}
