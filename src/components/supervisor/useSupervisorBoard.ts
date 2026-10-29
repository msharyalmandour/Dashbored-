import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { ApprovalStatus } from "../../data/types";
import { tr } from "../../lib/i18n";

export interface BoardMinutes {
  id: string;
  meetingDate: string;
  attendees: string[];
  agenda: string;
  discussion: string;
  decisions: string;
  requestedAt: string;
  autoApprovesAt: string;
  actions: { text: string; assigneeName: string | null; dueDate: string | null; done: boolean }[];
}
export interface BoardDecision { id: string; question: string; options: string[]; neededBy: string | null; createdAt: string }
export interface BoardBooking { id: string; date: string; time: string; durationMin: number; note: string; createdAt: string }
export interface BoardAvailability { windows: { weekday: number; start: string; end: string }[]; slotMinutes: number; autoConfirm: boolean; replyDays: number | null; note: string }
export interface Board {
  teamName: string;
  today: string;
  waiting: { minutes: BoardMinutes[]; decisions: BoardDecision[]; bookings: BoardBooking[] };
  recentMinutes: { id: string; meetingDate: string; status: ApprovalStatus; total: number; done: number }[];
  lastMeeting: { meetingDate: string; total: number; done: number } | null;
  upcoming: { date: string; time: string }[];
  availability: BoardAvailability | null;
}

function errorText(raw: string | undefined): string {
  const m = raw ?? "";
  if (m.includes("request not open") || m.includes("booking not pending") || m.includes("no approval request")) return tr("تم الرد على هذا الطلب مسبقًا.");
  if (m.includes("note required")) return tr("اكتبوا وش التعديل المطلوب.");
  return tr("ما تمّت العملية — حاولوا مرة ثانية.");
}

/** «تنتظركم» وأوقات المشرف/ة: نفس الـ RPCs اللي كانت بلوحة المشرف (بدون تسجيل دخول، بالرابط بس). */
export function useSupervisorBoard(token: string | undefined, name: string) {
  const [board, setBoard] = useState<Board | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !token) return;
    const { data, error: rpcError } = await supabase.rpc("get_supervisor_board", { p_token: token });
    if (rpcError || !data) return;
    setBoard(data as Board);
  }, [token]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  /** ينفّذ ردّ المشرف/ة. reload=false: المتصل يحدّث بعد ما تخلص حركة اختفاء الكرت */
  const run = useCallback(
    async (key: string, fn: string, args: Record<string, unknown>, reload = true) => {
      if (!supabase || !token || busy) return false;
      setBusy(key);
      setError(null);
      const { error: rpcError } = await supabase.rpc(fn, { p_token: token, ...args, p_name: name.trim() });
      setBusy(null);
      if (rpcError) {
        setError(errorText(rpcError.message));
        await load();
        return false;
      }
      try {
        if (name.trim()) localStorage.setItem("wesync-supervisor-name", name.trim());
      } catch {
        // ما يهم
      }
      if (reload) await load();
      return true;
    },
    [token, busy, name, load],
  );

  const saveAvailability = useCallback(
    async (av: { windows: { weekday: number; start: string; end: string }[]; slot: number; auto: boolean; replyDays: string; note: string }) => {
      if (!supabase || !token || busy) return false;
      setBusy("availability");
      setError(null);
      const rd = av.replyDays.trim() ? Math.min(30, Math.max(1, Math.round(Number(av.replyDays)))) : null;
      const { error: rpcError } = await supabase.rpc("supervisor_set_availability", {
        p_token: token,
        p_windows: av.windows.filter((w) => w.start && w.end && w.start < w.end),
        p_slot: av.slot,
        p_auto: av.auto,
        p_reply_days: Number.isFinite(rd as number) ? rd : null,
        p_note: av.note.trim(),
      });
      setBusy(null);
      if (rpcError) {
        setError(tr("ما انحفظت أوقاتكم — تأكدوا إن وقت البداية قبل النهاية."));
        return false;
      }
      await load();
      return true;
    },
    [token, busy, load],
  );

  return { board, busy, error, setError, load, run, saveAvailability };
}
