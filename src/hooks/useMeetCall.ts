import { useCallback, useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { track } from "../lib/analytics";

/** «ويسي يتصل»: آخر مكالمة للفريق (آخر ساعة) + ردود الأعضاء، حيّة. الجداول تنشأ من PENDING_2026-11-27_wesy_calls.sql */

export type CallAnswer = "join" | "later" | "cant";
export interface MeetCall {
  id: string;
  startedBy: string | null;
  source: string;
  createdAt: string;
}
export interface MeetCallAnswer {
  profileId: string;
  answer: CallAnswer;
  reason: string;
  updatedAt: string;
}

const RECENT_MS = 60 * 60_000;
const mapCall = (r: { id: string; started_by: string | null; source: string; created_at: string }): MeetCall => ({ id: r.id, startedBy: r.started_by, source: r.source, createdAt: r.created_at });
const mapAns = (r: { profile_id: string; answer: CallAnswer; reason: string; updated_at: string }): MeetCallAnswer => ({ profileId: r.profile_id, answer: r.answer, reason: r.reason ?? "", updatedAt: r.updated_at });

export function useMeetCall() {
  const { team, currentUser } = useAuth();
  const teamId = team?.id ?? "";
  const me = currentUser?.id ?? "";
  const [call, setCall] = useState<MeetCall | null>(null);
  const [answers, setAnswers] = useState<MeetCallAnswer[]>([]);
  /** وصلت مكالمة جديدة وأنا فاتح التطبيق (مو اللي بدأتها) */
  const [incoming, setIncoming] = useState<MeetCall | null>(null);
  const callRef = useRef("");

  useEffect(() => {
    if (!isSupabaseConfigured || !teamId) return;
    let off = false;
    const since = new Date(Date.now() - RECENT_MS).toISOString();
    void supabase!
      .from("meet_calls")
      .select("id, started_by, source, created_at")
      .eq("team_id", teamId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (off || error || !data) return;
        setCall(mapCall(data));
      });
    const ch = supabase!
      .channel(`meet-calls:${teamId}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "meet_calls", filter: `team_id=eq.${teamId}` }, (p) => {
        const c = mapCall(p.new as never);
        setCall(c);
        setAnswers([]);
        if (c.startedBy !== me) setIncoming(c);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "meet_call_answers", filter: `team_id=eq.${teamId}` }, (p) => {
        const a = p.new as { call_id?: string; profile_id?: string } | null;
        if (!a?.profile_id || a.call_id !== callRef.current) return;
        setAnswers((xs) => [...xs.filter((x) => x.profileId !== a.profile_id), mapAns(a as never)]);
      })
      .subscribe();
    return () => {
      off = true;
      void supabase!.removeChannel(ch);
    };
  }, [teamId, me]);

  // ردود المكالمة الحالية
  const callId = call?.id ?? "";
  useEffect(() => {
    callRef.current = callId;
  }, [callId]);
  useEffect(() => {
    if (!isSupabaseConfigured || !callId) return;
    let off = false;
    void supabase!
      .from("meet_call_answers")
      .select("profile_id, answer, reason, updated_at")
      .eq("call_id", callId)
      .then(({ data }) => {
        if (!off && data) setAnswers((data as never[]).map(mapAns));
      });
    return () => {
      off = true;
    };
  }, [callId]);

  const answer = useCallback(
    async (a: CallAnswer, reason = "", forCall?: string) => {
      const id = forCall ?? callId;
      if (!isSupabaseConfigured || !id || !teamId || !me) return;
      setAnswers((xs) => [...xs.filter((x) => x.profileId !== me), { profileId: me, answer: a, reason, updatedAt: new Date().toISOString() }]);
      await supabase!
        .from("meet_call_answers")
        .upsert({ call_id: id, team_id: teamId, profile_id: me, answer: a, reason: reason.slice(0, 120), updated_at: new Date().toISOString() }, { onConflict: "call_id,profile_id" })
        .then(() => {}, () => {});
      track("meet_call_answer", { answer: a });
    },
    [callId, teamId, me],
  );

  /** ويسي يتصل على الفريق (اللي مو بالغرفة يجيه إشعار + شاشة مكالمة) */
  const ring = useCallback(async (source: "join" | "manual") => {
    if (!isSupabaseConfigured) return null;
    try {
      const { data } = await supabase!.functions.invoke("meet-token", { body: { action: "ring", source } });
      const d = data as { callId?: string | null; rang?: number; reused?: boolean } | null;
      if (d?.callId) track("meet_ring", { source, rang: d.rang ?? 0 });
      return d;
    } catch {
      return null;
    }
  }, []);

  const recent = !!call && Date.now() - Date.parse(call.createdAt) < RECENT_MS;
  return { call: recent ? call : null, answers, incoming, dismissIncoming: () => setIncoming(null), answer, ring, me };
}
