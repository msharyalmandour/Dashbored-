import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AvailabilityWindow,
  DecisionRequestRow,
  MeetingBookingRow,
  MinutesActionRow,
  MinutesApprovalRow,
  SupervisorAvailabilityRow,
} from "../data/types";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

let channelCounter = 0;

interface ActionDb { id: string; minutes_id: string; text: string; assignee_id: string | null; due_date: string | null; task_id: string | null }
interface ApprovalDb { minutes_id: string; status: MinutesApprovalRow["status"]; requested_at: string; resolved_at: string | null; note: string; supervisor_name: string }
interface DecisionDb { id: string; question: string; options: string[]; needed_by: string | null; status: DecisionRequestRow["status"]; chosen_index: number | null; answer_note: string; supervisor_name: string; answered_at: string | null; created_at: string; created_by: string | null }
interface AvailabilityDb { windows: AvailabilityWindow[]; slot_minutes: number; auto_confirm: boolean; reply_days: number | null; note: string }
interface BookingDb { id: string; booking_date: string; booking_time: string; duration_min: number; status: MeetingBookingRow["status"]; note: string; supervisor_note: string; created_at: string }

export interface NewAction {
  text: string;
  assigneeId?: string;
  dueDate?: string;
}

/** أخطاء الدوال ترجع نص إنجليزي من قاعدة البيانات — نحوّلها لرسالة عربية مفهومة */
export function meetingErrorMessage(raw: string | undefined): string {
  const m = raw ?? "";
  if (m.includes("already booked")) return "هذا الموعد محجوز عندكم مسبقًا.";
  if (m.includes("outside availability")) return "هذا الوقت خارج أوقات المشرف/ة المتاحة. اختاروا وقتًا من القائمة.";
  if (m.includes("too many bookings")) return "عندكم ٥ مواعيد معلّقة أو مؤكدة، ألغوا واحدًا أول.";
  if (m.includes("bad date")) return "التاريخ لازم يكون من اليوم إلى ٦٠ يومًا قادمة.";
  if (m.includes("not allowed")) return "اشتراك الفريق منتهي أو ما عندكم صلاحية الكتابة.";
  return "صار خطأ — حاولوا مرة ثانية.";
}

/** كل ما يخص التواصل مع المشرف/ة: بنود المحاضر، الاعتماد، طلبات القرار، أوقاتها المتاحة، والحجوزات.
    تتحدّث مباشرة (Realtime) وبدون أي بيانات وهمية. */
export function useMeetings() {
  const { team } = useAuth();
  const teamId = team?.id;
  const [actions, setActions] = useState<MinutesActionRow[]>([]);
  const [approvals, setApprovals] = useState<MinutesApprovalRow[]>([]);
  const [decisions, setDecisions] = useState<DecisionRequestRow[]>([]);
  const [availability, setAvailability] = useState<SupervisorAvailabilityRow | null>(null);
  const [bookings, setBookings] = useState<MeetingBookingRow[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const channelIdRef = useRef<number | null>(null);
  channelIdRef.current ??= channelCounter++;

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !teamId) return;
    const db = supabase!;
    const [a, ap, d, av, b] = await Promise.all([
      db.from("minutes_actions").select("id, minutes_id, text, assignee_id, due_date, task_id").eq("team_id", teamId).order("created_at"),
      db.from("minutes_approvals").select("minutes_id, status, requested_at, resolved_at, note, supervisor_name").eq("team_id", teamId),
      db.from("decision_requests").select("id, question, options, needed_by, status, chosen_index, answer_note, supervisor_name, answered_at, created_at, created_by").eq("team_id", teamId).order("created_at", { ascending: false }),
      db.from("supervisor_availability").select("windows, slot_minutes, auto_confirm, reply_days, note").eq("team_id", teamId).maybeSingle(),
      db.from("meeting_bookings").select("id, booking_date, booking_time, duration_min, status, note, supervisor_note, created_at").eq("team_id", teamId).order("booking_date").order("booking_time"),
    ]);
    setActions(((a.data ?? []) as ActionDb[]).map((r) => ({ id: r.id, minutesId: r.minutes_id, text: r.text, assigneeId: r.assignee_id, dueDate: r.due_date, taskId: r.task_id })));
    setApprovals(((ap.data ?? []) as ApprovalDb[]).map((r) => ({ minutesId: r.minutes_id, status: r.status, requestedAt: r.requested_at, resolvedAt: r.resolved_at, note: r.note, supervisorName: r.supervisor_name })));
    setDecisions(((d.data ?? []) as DecisionDb[]).map((r) => ({ id: r.id, question: r.question, options: r.options, neededBy: r.needed_by, status: r.status, chosenIndex: r.chosen_index, answerNote: r.answer_note, supervisorName: r.supervisor_name, answeredAt: r.answered_at, createdAt: r.created_at, createdById: r.created_by })));
    const avRow = av.data as AvailabilityDb | null;
    setAvailability(avRow ? { windows: Array.isArray(avRow.windows) ? avRow.windows : [], slotMinutes: avRow.slot_minutes, autoConfirm: avRow.auto_confirm, replyDays: avRow.reply_days, note: avRow.note } : null);
    setBookings(((b.data ?? []) as BookingDb[]).map((r) => ({ id: r.id, date: r.booking_date, time: r.booking_time, durationMin: r.duration_min, status: r.status, note: r.note, supervisorNote: r.supervisor_note, createdAt: r.created_at })));
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!teamId) {
      setLoading(false);
      return;
    }
    load();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const debounced = () => {
      clearTimeout(timer);
      timer = setTimeout(load, 200);
    };
    let ch = supabase!.channel(`meetings-sync-${channelIdRef.current}`);
    for (const table of ["minutes_actions", "minutes_approvals", "decision_requests", "supervisor_availability", "meeting_bookings", "tasks"]) {
      ch = ch.on("postgres_changes", { event: "*", schema: "public", table }, debounced);
    }
    ch.subscribe();
    return () => {
      clearTimeout(timer);
      supabase!.removeChannel(ch);
    };
  }, [teamId, load]);

  const rpc = async (fn: string, args: Record<string, unknown>): Promise<{ data?: unknown; error?: string }> => {
    const { data, error } = await supabase!.rpc(fn, args);
    if (error) return { error: meetingErrorMessage(error.message) };
    return { data };
  };

  /** بنود المحضر ← مهام فعلية بالموقع (مسؤول + موعد) */
  const createActions = async (minutesId: string, items: NewAction[]) => {
    const payload = items.filter((i) => i.text.trim()).map((i) => ({ text: i.text.trim(), assigneeId: i.assigneeId ?? "", dueDate: i.dueDate ?? "" }));
    if (payload.length === 0) return { created: 0 };
    const r = await rpc("create_minutes_actions", { p_minutes_id: minutesId, p_actions: payload });
    return r.error ? { created: 0, error: r.error } : { created: Number((r.data as { created?: number } | null)?.created ?? payload.length) };
  };

  const requestApproval = async (minutesId: string) => {
    const r = await rpc("request_minutes_approval", { p_minutes_id: minutesId });
    if (!r.error) await load();
    return r;
  };

  const askDecision = async (input: { question: string; options: string[]; neededBy?: string }) => {
    if (!teamId) return { error: "no team" };
    const { data, error } = await supabase!
      .from("decision_requests")
      .insert({ team_id: teamId, question: input.question.trim(), options: input.options.map((o) => o.trim()).filter(Boolean), needed_by: input.neededBy || null, created_by: (await supabase!.auth.getUser()).data.user?.id })
      .select("id")
      .single();
    if (error) return { error: meetingErrorMessage(error.message) };
    await load();
    return { id: (data as { id: string }).id };
  };

  const cancelDecision = async (id: string) => {
    const r = await rpc("cancel_decision_request", { p_id: id });
    if (!r.error) await load();
    return r;
  };

  const bookSlot = async (date: string, time: string, note = "") => {
    const r = await rpc("book_meeting_slot", { p_date: date, p_time: time, p_note: note });
    if (r.error) return { error: r.error };
    await load();
    const d = r.data as { id: string; status: "pending" | "confirmed" } | null;
    return { id: d?.id, status: d?.status };
  };

  const cancelBooking = async (id: string) => {
    const r = await rpc("cancel_meeting_booking", { p_id: id });
    if (!r.error) await load();
    return r;
  };

  return { actions, approvals, decisions, availability, bookings, loading, reload: load, createActions, requestApproval, askDecision, cancelDecision, bookSlot, cancelBooking };
}
