import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const RECENT_WINDOW_DAYS = 30;

/** أعضاء دفعوا حصتهم خلال آخر ٣٠ يوم — عشان قائمة "مين دفع" بصفحة الأسعار.
    مبني على جدول payments (سجل حقيقي من موقع Moyasar عبر الـ webhook)، فما
    له معنى بوضع العرض التجريبي — نفس منطق useResearchSearch.ts. الاشتراك
    نفسه تراكمي بالأيام مو شهر تقويمي ثابت، فـ "آخر ٣٠ يوم" تقريب معقول
    لعرض "دفعتوا هالفترة" بدون تعقيد حساب فترة فوترة دقيقة. */
export function useTeamPayments() {
  const [paidProfileIds, setPaidProfileIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const since = new Date();
    since.setDate(since.getDate() - RECENT_WINDOW_DAYS);

    supabase!
      .from("payments")
      .select("profile_id, status, created_at")
      .eq("status", "paid")
      .gte("created_at", since.toISOString())
      .then(({ data }) => {
        const ids = new Set<string>();
        for (const row of data ?? []) {
          if (row.profile_id) ids.add(row.profile_id as string);
        }
        setPaidProfileIds(ids);
        setLoading(false);
      });
  }, []);

  return { paidProfileIds, loading };
}
