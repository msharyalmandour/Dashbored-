import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { isEn, tr } from "../../lib/i18n";
import { formatDateShort } from "../../lib/date";
import { notifySupervisor } from "../../lib/supervisorNotify";
import { addDays, dayCount, daysBetween, REASONS, type DashAway, type DashLog, type ExtReason, type ExtStatus } from "../../lib/supervisorDash";
import { Hourglass, Sheet, TimeLog, dayLabel } from "./SvTime";

/** جهة الطلاب: طلب تمديد رسمي (SupExtM) + شريط «مو متاح/ة» (SupAwayM) + سجل الوقت */

export interface TeamExtension {
  id: string;
  task_id: string;
  requested_by: string | null;
  current_due: string | null;
  requested_due: string;
  reason: ExtReason;
  note: string;
  status: ExtStatus;
  final_due: string | null;
  supervisor_note: string;
  created_at: string;
}
interface AwayRow {
  from_date: string;
  to_date: string;
  reason: string;
  defer_requests: boolean;
  moved_count: number;
  supervisor_name: string;
}

const riyadhToday = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);

/** بيانات الوقت للفريق (RLS: فريقكم بس). لو ملف SQL ما انطبق بعد ترجع فاضية بهدوء */
export function useTeamTime() {
  const [away, setAway] = useState<DashAway | null>(null);
  const [extensions, setExtensions] = useState<TeamExtension[]>([]);
  const [log, setLog] = useState<DashLog[]>([]);
  const [ready, setReady] = useState(false);
  const load = useCallback(async () => {
    if (!supabase) return;
    const today = riyadhToday();
    const [a, e, l] = await Promise.all([
      supabase.from("supervisor_away").select("from_date,to_date,reason,defer_requests,moved_count,supervisor_name").gte("to_date", today).maybeSingle(),
      supabase.from("extension_requests").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("time_log").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    const ar = a.data as AwayRow | null;
    setAway(ar && ar.from_date <= today ? { from: ar.from_date, to: ar.to_date, reason: ar.reason, deferRequests: ar.defer_requests, moved: ar.moved_count, name: ar.supervisor_name, moveMeetings: true, messageStudents: true } : null);
    setExtensions((e.data ?? []) as TeamExtension[]);
    setLog(
      ((l.data ?? []) as { id: string; actor: "student" | "supervisor"; actor_name: string; action: DashLog["action"]; task_title: string; from_date: string | null; to_date: string | null; note: string; created_at: string }[]).map((x) => ({
        id: x.id,
        actor: x.actor,
        actorName: x.actor_name,
        action: x.action,
        taskTitle: x.task_title,
        from: x.from_date,
        to: x.to_date,
        note: x.action === "requested" ? "" : x.note,
        at: x.created_at,
      })),
    );
    setReady(true);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { away, extensions, log, ready, reload: load };
}

// ───────── شريط «مو متاح/ة» ─────────
export function AwayStrip({ away, pending = 0, to = "/feedback" }: { away: DashAway | null; pending?: number; to?: string }) {
  if (!away) return null;
  const who = away.name || tr("المشرف/ة");
  const bits = [away.reason, away.moved ? tr("انزاح {0} مواعيد", away.moved) : "", away.deferRequests && pending ? tr("{0} طلبات تنتظر الرجعة", pending) : ""].filter(Boolean);
  const Chev = isEn ? ChevronRight : ChevronLeft;
  return (
    <section className="sd-strip sd-in" aria-label={tr("{0} مو متاح/ة", who)}>
      <Hourglass px={64} />
      <div style={{ flex: 1, lineHeight: 1.45, minWidth: 0 }}>
        <b style={{ display: "block", fontSize: 15, color: "#EAE3DC" }}>{tr("{0} مو متاح/ة لين {1}", who, formatDateShort(away.to))}</b>
        {bits.length > 0 && <span style={{ fontSize: 12, color: "#E9D3B8" }}>{bits.join(" · ")}</span>}
      </div>
      <Link to={to} style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: "#EAE3DC" }}>
        {tr("التفاصيل")}
        <Chev size={14} aria-hidden />
      </Link>
    </section>
  );
}

// ───────── «تحتاجون وقت أكثر؟» ─────────
export function ExtensionSheet({
  task,
  fromSupervisor,
  pendingFor,
  onClose,
  onSent,
}: {
  task: { id: string; title: string; dueDate: string | null };
  fromSupervisor?: boolean;
  /** طلب معلّق على نفس المهمة */
  pendingFor?: TeamExtension | null;
  onClose: () => void;
  onSent: (msg: string) => void;
}) {
  const today = riyadhToday();
  const base = task.dueDate && task.dueDate > today ? task.dueDate : today;
  const [pick, setPick] = useState<string>(addDays(base, 5));
  const [reason, setReason] = useState<ExtReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // أسبوعين يبدون من بداية أسبوع الموعد الحالي (الأحد)
  const days = useMemo(() => {
    const anchor = task.dueDate && task.dueDate > today ? task.dueDate : today;
    const dow = new Date(`${anchor}T12:00:00+03:00`).getUTCDay();
    const start = addDays(anchor, -dow);
    return Array.from({ length: 14 }, (_, i) => addDays(start, i));
  }, [task.dueDate, today]);
  const n = daysBetween(base, pick);
  const min = task.dueDate && task.dueDate >= today ? addDays(task.dueDate, 1) : today;

  const send = async () => {
    if (!supabase || !reason) return;
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.rpc("request_extension", { p_task_id: task.id, p_due: pick, p_reason: reason, p_note: note.trim() });
    setBusy(false);
    if (error) {
      const m = error.message;
      return setErr(
        m.includes("duplicate") || m.includes("one_pending")
          ? tr("فيه طلب تمديد معلّق على هالمهمة.")
          : m.includes("bad_date")
            ? tr("اختاروا موعد بعد الموعد الحالي.")
            : m.includes("read_only")
              ? tr("الاشتراك منتهي — الطلب يحتاج اشتراك فعّال.")
              : tr("ما انرسل الطلب — جرّبوا مرة ثانية."),
      );
    }
    if (typeof data === "string") void notifySupervisor("extension", data);
    onSent(tr("انرسل الطلب للمشرف/ة ✓"));
  };

  return (
    <Sheet label={tr("طلب تمديد رسمي")} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Hourglass px={76} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#FFB444" }}>{tr("طلب تمديد رسمي")}</div>
          <div className="sd-ttl" style={{ fontSize: 24 }}>
            {tr("تحتاجون وقت أكثر؟")}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, padding: 12, borderRadius: 16, background: "rgba(255,255,255,0.05)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 12, color: "#ABA095" }}>{tr("المهمة")}</div>
        <b style={{ fontSize: 15 }}>{task.title}</b>
        <div style={{ fontSize: 12, color: "#FFB2A6" }}>
          {task.dueDate ? tr("موعدها {0}", dayLabel(task.dueDate)) : tr("بدون موعد")}
          {fromSupervisor ? ` · ${tr("طلب من المشرف/ة")}` : ""}
        </div>
      </div>

      {pendingFor ? (
        <p style={{ margin: "14px 0 0", fontSize: 14, color: "#E9D3B8" }}>{tr("فيه طلب معلّق لين {0} — ينتظر رد المشرف/ة.", dayLabel(pendingFor.requested_due))}</p>
      ) : (
        <>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#ABA095", margin: "12px 0 6px" }}>
            {tr("الموعد الجديد")}
            {n && n > 0 ? (
              <>
                {" · "}
                <span style={{ color: "#FFC777" }}>+{dayCount(n)}</span>
              </>
            ) : null}
          </div>
          <div className="sd-cal" role="group" aria-label={tr("الموعد الجديد")}>
            {days.map((d) => {
              const cur = d === task.dueDate;
              const sel = d === pick;
              const disabled = d < min;
              return (
                <button
                  key={d}
                  type="button"
                  className={sel ? "sel" : cur ? "cur" : ""}
                  disabled={disabled}
                  aria-pressed={sel}
                  aria-label={`${dayLabel(d)}${cur ? ` · ${tr("الموعد الحالي")}` : ""}`}
                  onClick={() => setPick(d)}
                  dir="ltr"
                >
                  {Number(d.slice(8))}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 8, fontSize: 12, color: "#ABA095" }}>
            <span>
              <i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, boxShadow: "inset 0 0 0 1.5px #FF8A7A" }} /> {tr("الموعد الحالي")}
            </span>
            <span>
              <i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#F2EBE3" }} /> {tr("المطلوب")}
            </span>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44 }}>
              {tr("أو تاريخ ثاني")}
              <input type="date" value={pick} min={min} onChange={(e) => e.target.value && setPick(e.target.value)} style={{ background: "rgba(255,255,255,0.05)", border: 0, borderRadius: 10, color: "#EAE3DC", colorScheme: "dark", padding: "6px 8px", font: "inherit" }} />
            </label>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: "#ABA095", margin: "12px 0 6px" }}>{tr("ليش؟")}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {REASONS.map((r) => (
              <button key={r.key} type="button" className="sd-chipbtn" aria-pressed={reason === r.key} onClick={() => setReason(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
          <label className="sd-field" style={{ marginTop: 10 }}>
            <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder={tr("كلمتين توضح السبب (يشوفها المشرف/ة)")} aria-label={tr("ملاحظة")} />
          </label>
          {err && (
            <p role="alert" style={{ margin: "10px 0 0", fontSize: 13, color: "#FFB2A6" }}>
              {err}
            </p>
          )}
          <button type="button" className="sd-cta" style={{ marginTop: 14 }} disabled={!reason || busy || pick < min} onClick={send}>
            {tr("أرسلوا الطلب للمشرف/ة")}
          </button>
        </>
      )}
      <p style={{ margin: "8px 0 0", textAlign: "center", fontSize: 12, color: "#ABA095" }}>{tr("كل طلب ورد ينحفظ بسجل يشوفه الطرفين.")}</p>
    </Sheet>
  );
}

// ───────── صفحة المشرف/ة عند الطلاب: طلبات الوقت + السجل ─────────
export function TeamTimeCard({ titleOf }: { titleOf: (taskId: string) => string }) {
  const { away, extensions, log, ready, reload } = useTeamTime();
  const [busy, setBusy] = useState<string | null>(null);
  if (!ready || (!extensions.length && !log.length && !away)) return null;
  const pending = extensions.filter((e) => e.status === "pending");
  const withdraw = async (id: string) => {
    if (!supabase) return;
    setBusy(id);
    await supabase.rpc("withdraw_extension", { p_id: id });
    setBusy(null);
    void reload();
  };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <AwayStrip away={away} pending={pending.length} to="#time" />
      {pending.length > 0 && (
        <section id="time" className="sd-glass">
          <b style={{ fontSize: 17 }}>{tr("طلبات الوقت")}</b>
          {pending.map((e) => (
            <div key={e.id} className="sup-row">
              <div style={{ flex: 1, minWidth: 0, lineHeight: 1.4 }}>
                <b style={{ fontSize: 14 }}>{titleOf(e.task_id)}</b>
                <div style={{ fontSize: 12, color: "#ABA095" }}>
                  {tr("من {0} ← {1}", dayLabel(e.current_due), dayLabel(e.requested_due))} · {away?.deferRequests ? tr("تنتظر الرجعة") : tr("ينتظر رد المشرف/ة")}
                </div>
              </div>
              <button type="button" className="sup-btn-ghost" style={{ minHeight: 44 }} disabled={busy === e.id} onClick={() => withdraw(e.id)}>
                {tr("اسحبوا الطلب")}
              </button>
            </div>
          ))}
        </section>
      )}
      {log.length > 0 && <TimeLog log={log} limit={6} />}
    </div>
  );
}
