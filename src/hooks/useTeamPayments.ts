import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { planOf, type BillingPeriod } from "../lib/plans";

/** مين مغطّى حصته الحين (للقائمة بصفحة الاشتراك وللتذكيرات):
    كل دفعة تغطي صاحبها (أو اللي انْدفع عنه) لمدة باقتها — شهري 30 يوم، فصل 120، السنة الدراسية 270 —
    ودفعة «الفريق كامل» تغطي الكل. الاشتراك نفسه أيام للفريق كامل؛ هذي بس «مين دفع حصته».
    giftsToMe: دفعات دفعها زميل عنك (آخر 7 أيام) — لرسالة «أحمد دفع عنك 💛». */
export interface PaymentRow {
  profile_id: string | null;
  paid_by?: string | null;
  period?: BillingPeriod | null;
  for_team?: boolean | null;
  created_at: string;
}

export function coveredIds(rows: PaymentRow[], memberIds: string[], now = Date.now()): Set<string> {
  const ids = new Set<string>();
  for (const r of rows) {
    const days = planOf((r.period as BillingPeriod) ?? "month").days;
    if (new Date(r.created_at).getTime() + days * 86_400_000 < now) continue;
    if (r.for_team) memberIds.forEach((m) => ids.add(m));
    else if (r.profile_id) ids.add(r.profile_id);
  }
  return ids;
}

export function useTeamPayments(memberIds: string[] = [], myId?: string) {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const since = new Date();
    since.setDate(since.getDate() - 280); // أطول باقة (270 يوم) + هامش
    void (async () => {
      // الأعمدة الجديدة (period/paid_by/for_team) بعد ملف SQL 2026-11-27؛ قبلها نقرأ القديمة بس
      let res = await supabase!
        .from("payments")
        .select("profile_id, paid_by, period, for_team, created_at, status")
        .eq("status", "paid")
        .gte("created_at", since.toISOString());
      if (res.error) {
        res = await supabase!.from("payments").select("profile_id, created_at, status").eq("status", "paid").gte("created_at", since.toISOString()) as typeof res;
      }
      setRows(((res.data ?? []) as PaymentRow[]));
      setLoading(false);
    })();
  }, []);

  const key = memberIds.join(",");
  const paidProfileIds = coveredIds(rows, key ? key.split(",") : []);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const giftsToMe = myId
    ? rows.filter((r) => r.profile_id === myId && r.paid_by && r.paid_by !== myId && new Date(r.created_at).getTime() > weekAgo)
    : [];

  return { paidProfileIds, giftsToMe, loading };
}
