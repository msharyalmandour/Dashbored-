import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

/** كم شي ينتظر الدكتورة (محضر للاعتماد · موعد مقترح · سؤال مفتوح) — لحالة «ينتظرون الدكتورة» بكرت الجاي */
export function useDocWaiting(): number {
  const { team, mode } = useAuth();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (mode !== "supabase" || !supabase || !team?.id) return;
    let off = false;
    const head = { count: "exact" as const, head: true };
    void Promise.all([
      supabase.from("minutes_approvals").select("id", head).eq("status", "pending"),
      supabase.from("meeting_bookings").select("id", head).eq("status", "pending"),
      supabase.from("decision_requests").select("id", head).eq("status", "open"),
    ]).then((r) => {
      if (!off) setN(r.reduce((a, x) => a + (x.error ? 0 : x.count ?? 0), 0));
    });
    return () => {
      off = true;
    };
  }, [team?.id, mode]);
  return n;
}
