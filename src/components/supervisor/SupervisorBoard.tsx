import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarCheck, CalendarClock, CalendarX, Check, CheckCheck, ChevronDown, Clock, HelpCircle, Inbox, Loader2, NotebookPen, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import SupervisorSetupPanel from "./SupervisorSetupPanel";
import { formatDateFull, formatDateShort, relativeDayLabel } from "../../lib/date";
import { APPROVAL_LABEL, WEEKDAY_NAMES } from "../../lib/meetings";
import type { ApprovalStatus } from "../../data/types";
import { tr, trx } from "../../lib/i18n";

interface BoardMinutes {
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
interface BoardDecision { id: string; question: string; options: string[]; neededBy: string | null; createdAt: string }
interface BoardBooking { id: string; date: string; time: string; durationMin: number; note: string; createdAt: string }
interface BoardAvailability { windows: { weekday: number; start: string; end: string }[]; slotMinutes: number; autoConfirm: boolean; replyDays: number | null; note: string }
interface Board {
  teamName: string;
  today: string;
  waiting: { minutes: BoardMinutes[]; decisions: BoardDecision[]; bookings: BoardBooking[] };
  recentMinutes: { id: string; meetingDate: string; status: ApprovalStatus; total: number; done: number }[];
  lastMeeting: { meetingDate: string; total: number; done: number } | null;
  upcoming: { date: string; time: string }[];
  availability: BoardAvailability | null;
}

interface WindowRow { key: number; weekday: number; start: string; end: string }
let winKey = 0;

const card = "rounded-3xl border border-brand-100/70 bg-paper p-5 shadow-sm shadow-brand-950/5 sm:p-7";
const inputClass = "w-full rounded-xl border border-brand-100 bg-paper px-3.5 py-2.5 text-sm text-brand-950 outline-none placeholder:text-brand-950/30 focus:border-brand-300";

function errorText(raw: string | undefined): string {
  const m = raw ?? "";
  if (m.includes("request not open") || m.includes("booking not pending") || m.includes("no approval request")) return tr("تم الرد على هذا الطلب مسبقًا.");
  if (m.includes("note required")) return tr("اكتبوا وش التعديل المطلوب.");
  return tr("ما تمّت العملية — حاولوا مرة ثانية.");
}

interface SupervisorBoardProps {
  token: string;
  name: string;
  onNameChange: (v: string) => void;
  /** عدد الأشياء اللي تنتظر المشرف/ة — للتبويب العلوي */
  onWaitingCount?: (n: number) => void;
}

/** «تنتظرك»: كل شي يحتاج ردّ المشرف/ة، بضغطة وحدة وبدون تسجيل دخول — محاضر للاعتماد، قرارات، ومواعيد؛
    ومعها أوقاتها المتاحة وتفضيلات الرد، وإنجاز بنود آخر اجتماع. */
export default function SupervisorBoard({ token, name, onNameChange, onWaitingCount }: SupervisorBoardProps) {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [noteFor, setNoteFor] = useState<{ id: string; kind: "changes" | "decline" } | null>(null);
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [decisionNote, setDecisionNote] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => Date.now());

  // أوقاتي وتفضيلاتي
  const [showSettings, setShowSettings] = useState(false);
  const [windows, setWindows] = useState<WindowRow[]>([]);
  const [slot, setSlot] = useState(30);
  const [auto, setAuto] = useState(true);
  const [replyDays, setReplyDays] = useState("");
  const [avNote, setAvNote] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const settingsLoaded = useRef(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error: rpcError } = await supabase.rpc("get_supervisor_board", { p_token: token });
    if (rpcError || !data) return;
    const b = data as Board;
    setBoard(b);
    setNow(Date.now());
    if (!settingsLoaded.current) {
      settingsLoaded.current = true;
      if (b.availability) {
        setWindows(b.availability.windows.map((w) => ({ key: winKey++, ...w })));
        setSlot(b.availability.slotMinutes);
        setAuto(b.availability.autoConfirm);
        setReplyDays(b.availability.replyDays ? String(b.availability.replyDays) : "");
        setAvNote(b.availability.note);
      }
    }
  }, [token]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const waitingCount = board ? board.waiting.minutes.length + board.waiting.decisions.length + board.waiting.bookings.length : 0;
  useEffect(() => {
    onWaitingCount?.(waitingCount);
  }, [waitingCount, onWaitingCount]);

  const run = async (key: string, fn: string, args: Record<string, unknown>) => {
    if (!supabase || busy) return false;
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
    setNoteFor(null);
    setNote("");
    await load();
    return true;
  };

  const saveAvailability = async () => {
    if (!supabase || busy) return;
    setBusy("availability");
    setError(null);
    const rd = replyDays.trim() ? Math.min(30, Math.max(1, Math.round(Number(replyDays)))) : null;
    const { error: rpcError } = await supabase.rpc("supervisor_set_availability", {
      p_token: token,
      p_windows: windows.filter((w) => w.start && w.end && w.start < w.end).map(({ weekday, start, end }) => ({ weekday, start, end })),
      p_slot: slot,
      p_auto: auto,
      p_reply_days: Number.isFinite(rd as number) ? rd : null,
      p_note: avNote.trim(),
    });
    setBusy(null);
    if (rpcError) {
      setError(tr("ما انحفظت أوقاتكم — تأكدوا إن وقت البداية قبل النهاية."));
      return;
    }
    setSavedAt(Date.now());
    await load();
  };

  if (!board) return null;
  const { waiting } = board;
  const empty = waitingCount === 0;

  return (
    <>
      <SupervisorSetupPanel
        token={token}
        name={name}
        onNameChange={onNameChange}
        hasWindows={!!board.availability?.windows.length}
        onOpenAvailability={() => {
          setShowSettings(true);
          setTimeout(() => document.getElementById("sv-settings")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
        }}
      />

      <div id="sv-waiting" className={`${card} mb-4 scroll-mt-16`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-display text-base font-extrabold text-brand-950">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-amber-accent-300 to-brand-400 text-white shadow-sm">
              <Inbox size={17} />
            </span>{trx("تنتظركم{0}", !empty && <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-xs font-bold text-brand-600">{waitingCount}</span>)}</p>
        </div>

        {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">{error}</p>}

        {empty ? (
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-600">
            <CheckCheck size={16} />{tr("ما ينتظركم شي الحين. إذا احتاج الفريق شي، يظهر هنا وتوصلكم رسالة.")}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {waiting.minutes.map((m) => {
              const hoursLeft = Math.max(0, Math.ceil((new Date(m.autoApprovesAt).getTime() - now) / 3600_000));
              const isOpen = expanded[m.id] ?? true;
              const askingChanges = noteFor?.id === m.id && noteFor.kind === "changes";
              return (
                <div key={m.id} className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-extrabold text-brand-950"><NotebookPen size={14} className="text-brand-500" />{trx("محضر اجتماع {0}", formatDateFull(m.meetingDate))}</p>
                      <p className="mt-0.5 text-xs text-brand-950/50">{trx("يُعتمد تلقائيًا بعد {0} ساعة إن لم يصل اعتراض", hoursLeft)}</p>
                    </div>
                    <button onClick={() => setExpanded((e) => ({ ...e, [m.id]: !isOpen }))} className="flex items-center gap-1 text-xs font-bold text-brand-950/50 hover:text-brand-700">
                      <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      {isOpen ? tr("إخفاء") : tr("عرض المحضر")}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="mt-3 space-y-2 text-sm text-brand-950/80">
                      {m.attendees.length > 0 && <p className="text-xs text-brand-950/50">{trx("الحاضرون: {0}", m.attendees.join(tr("، ")))}</p>}
                      {m.agenda && <p className="whitespace-pre-wrap rounded-xl bg-paper p-3 text-xs leading-relaxed text-brand-950/65">{m.agenda}</p>}
                      <p className="whitespace-pre-wrap">{m.discussion}</p>
                      {m.decisions && <p className="whitespace-pre-wrap"><b>{tr("القرارات:")}</b> {m.decisions}</p>}
                      {m.actions.length > 0 && (
                        <ul className="space-y-1">
                          {m.actions.map((a, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${a.done ? "bg-emerald-500" : "bg-brand-950/25"}`} />
                              <span>{a.text} <span className="text-xs text-brand-950/45">— {a.assigneeName ?? "—"}{a.dueDate ? ` · ${formatDateShort(a.dueDate)}` : ""}</span></span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {askingChanges ? (
                    <div className="mt-3 space-y-2">
                      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} placeholder={tr("وش التعديل المطلوب؟")} aria-label={tr("التعديل المطلوب")} className={inputClass} />
                      <div className="flex gap-2">
                        <button onClick={() => run(m.id, "supervisor_resolve_minutes", { p_minutes_id: m.id, p_decision: "changes_requested", p_note: note })} disabled={!note.trim() || busy === m.id} className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{trx("{0}إرسال التعديل", busy === m.id && <Loader2 size={14} className="animate-spin" />)}</button>
                        <button onClick={() => { setNoteFor(null); setNote(""); }} className="rounded-xl border border-brand-100 px-4 py-2 text-sm font-bold text-brand-950/60">{tr("رجوع")}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => run(m.id, "supervisor_resolve_minutes", { p_minutes_id: m.id, p_decision: "approved", p_note: "" })} disabled={busy === m.id} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-brand-500 to-brand-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-brand-500/30 disabled:opacity-50">{trx("{0}اعتماد", busy === m.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />)}</button>
                      <button onClick={() => { setNoteFor({ id: m.id, kind: "changes" }); setNote(""); }} className="flex items-center gap-1.5 rounded-xl border border-brand-100 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50">
                        <Pencil size={14} />{tr("أطلب تعديلًا")}</button>
                    </div>
                  )}
                </div>
              );
            })}

            {waiting.decisions.map((d) => {
              const choice = picked[d.id];
              return (
                <div key={d.id} className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
                  <p className="flex items-start gap-1.5 text-sm font-extrabold text-brand-950"><HelpCircle size={15} className="mt-0.5 shrink-0 text-brand-500" />{d.question}</p>
                  {d.neededBy && <p className="mt-0.5 text-xs text-brand-950/50">{trx("مطلوب قبل {0} ({1})", formatDateShort(d.neededBy), relativeDayLabel(d.neededBy))}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {d.options.map((o, i) => (
                      <button key={i} onClick={() => setPicked((p) => ({ ...p, [d.id]: i }))} aria-pressed={choice === i} className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${choice === i ? "border-brand-500 bg-brand-500 text-white" : "border-brand-100 bg-paper text-brand-950/80 hover:bg-brand-50"}`}>
                        {o}
                      </button>
                    ))}
                  </div>
                  {choice !== undefined && (
                    <div className="mt-3 space-y-2">
                      <input value={decisionNote[d.id] ?? ""} onChange={(e) => setDecisionNote((p) => ({ ...p, [d.id]: e.target.value }))} maxLength={1000} placeholder={tr("ملاحظة (اختياري)")} aria-label={tr("ملاحظة على القرار")} className={inputClass} />
                      <button onClick={() => run(d.id, "supervisor_answer_decision", { p_id: d.id, p_choice: choice, p_note: decisionNote[d.id] ?? "" })} disabled={busy === d.id} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-brand-500 to-brand-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-brand-500/30 disabled:opacity-50">{trx("{0}تأكيد القرار: {1}", busy === d.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />, d.options[choice])}</button>
                    </div>
                  )}
                </div>
              );
            })}

            {waiting.bookings.map((b) => {
              const declining = noteFor?.id === b.id && noteFor.kind === "decline";
              return (
                <div key={b.id} className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
                  <p className="flex items-center gap-1.5 text-sm font-extrabold text-brand-950"><CalendarClock size={15} className="text-brand-500" />{trx("اقتراح اجتماع: {0} · {1}", formatDateFull(b.date), b.time)}</p>
                  <p className="mt-0.5 text-xs text-brand-950/50">{trx("{0} · {1} دقيقة{2}", relativeDayLabel(b.date), b.durationMin, b.note ? ` · ${b.note}` : "")}</p>
                  {declining ? (
                    <div className="mt-3 space-y-2">
                      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={tr("اقترحوا وقتًا بديلًا (اختياري)")} aria-label={tr("الوقت البديل")} className={inputClass} />
                      <div className="flex gap-2">
                        <button onClick={() => run(b.id, "supervisor_respond_booking", { p_id: b.id, p_decision: "decline", p_note: note })} disabled={busy === b.id} className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{trx("{0}أعتذر عن الموعد", busy === b.id && <Loader2 size={14} className="animate-spin" />)}</button>
                        <button onClick={() => { setNoteFor(null); setNote(""); }} className="rounded-xl border border-brand-100 px-4 py-2 text-sm font-bold text-brand-950/60">{tr("رجوع")}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => run(b.id, "supervisor_respond_booking", { p_id: b.id, p_decision: "confirm", p_note: "" })} disabled={busy === b.id} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-brand-500 to-brand-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-brand-500/30 disabled:opacity-50">{trx("{0}تأكيد الموعد", busy === b.id ? <Loader2 size={14} className="animate-spin" /> : <CalendarCheck size={14} />)}</button>
                      <button onClick={() => { setNoteFor({ id: b.id, kind: "decline" }); setNote(""); }} className="flex items-center gap-1.5 rounded-xl border border-brand-100 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50">
                        <CalendarX size={14} />{tr("لا يناسبني")}</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(board.lastMeeting || board.upcoming.length > 0) && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {board.lastMeeting && board.lastMeeting.total > 0 && (
              <div className="rounded-2xl border border-brand-100 p-4">
                <p className="text-xs font-bold text-brand-950/50">{trx("آخر اجتماع ({0})", formatDateShort(board.lastMeeting.meetingDate))}</p>
                <p className="mt-1 font-display text-lg font-extrabold text-brand-950">{trx("{0} من {1} بنود منجزة", board.lastMeeting.done, board.lastMeeting.total)}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100">
                  <div className="h-full rounded-full bg-gradient-to-l from-brand-400 to-brand-600" style={{ width: `${Math.round((board.lastMeeting.done / board.lastMeeting.total) * 100)}%` }} />
                </div>
              </div>
            )}
            {board.upcoming.length > 0 && (
              <div className="rounded-2xl border border-brand-100 p-4">
                <p className="text-xs font-bold text-brand-950/50">{tr("اجتماعات مؤكدة قادمة")}</p>
                <ul className="mt-1 space-y-0.5">
                  {board.upcoming.slice(0, 3).map((u, i) => (
                    <li key={i} className="text-sm font-semibold text-brand-950">{formatDateFull(u.date)} · {u.time}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {board.recentMinutes.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {board.recentMinutes.map((r) => (
              <li key={r.id} className="rounded-full border border-brand-100 px-3 py-1 text-[11px] font-semibold text-brand-950/60">
                {formatDateShort(r.meetingDate)} · {APPROVAL_LABEL[r.status].label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div id="sv-settings" className={`${card} mb-4 scroll-mt-16`}>
        <button onClick={() => setShowSettings((s) => !s)} className="flex w-full items-center justify-between gap-2 text-start" aria-expanded={showSettings}>
          <span className="flex items-center gap-2 font-display text-base font-extrabold text-brand-950">
            <Settings2 size={17} className="text-brand-500" />{tr("أوقاتي وتفضيلاتي")}<span className="text-xs font-medium text-brand-950/45">{board.availability?.windows.length ? tr("محدّدة") : tr("حدّدوها مرة وحدة وتوفّرون رسائل التنسيق")}</span>
          </span>
          <ChevronDown size={16} className={`text-brand-950/40 transition-transform ${showSettings ? "rotate-180" : ""}`} />
        </button>
        {showSettings && (
          <div className="mt-5 space-y-4">
            <p className="text-xs leading-relaxed text-brand-950/55">{tr("حدّدوا نوافذ أوقاتكم المتاحة لهذا الفريق. الفريق يحجز فقط من هذي الأوقات، ويتأكد الموعد تلقائيًا لو فعّلتم ذلك. لا شي يُحجز خارجها.")}</p>
            <ul className="space-y-2">
              {windows.map((w) => (
                <li key={w.key} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
                  <select value={w.weekday} onChange={(e) => setWindows((x) => x.map((y) => (y.key === w.key ? { ...y, weekday: Number(e.target.value) } : y)))} aria-label={tr("اليوم")} className={inputClass}>
                    {WEEKDAY_NAMES.map((n, i) => (
                      <option key={n} value={i}>{n}</option>
                    ))}
                  </select>
                  <input type="time" value={w.start} onChange={(e) => setWindows((x) => x.map((y) => (y.key === w.key ? { ...y, start: e.target.value } : y)))} aria-label={tr("من")} className={`${inputClass} !w-auto`} />
                  <input type="time" value={w.end} onChange={(e) => setWindows((x) => x.map((y) => (y.key === w.key ? { ...y, end: e.target.value } : y)))} aria-label={tr("إلى")} className={`${inputClass} !w-auto`} />
                  <button onClick={() => setWindows((x) => x.filter((y) => y.key !== w.key))} aria-label={tr("حذف")} className="rounded-xl p-2.5 text-brand-950/40 hover:bg-rose-500/10 hover:text-rose-500">
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={() => setWindows((x) => [...x, { key: winKey++, weekday: 0, start: "10:00", end: "12:00" }])} disabled={windows.length >= 14} className="flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline disabled:opacity-40">
              <Plus size={13} />{tr("أضيفوا نافذة وقت")}</button>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-brand-950/60">{tr("مدة الاجتماع")}<select value={slot} onChange={(e) => setSlot(Number(e.target.value))} className={`${inputClass} mt-1`}>
                  {[15, 20, 30, 45, 60].map((m) => (
                    <option key={m} value={m}>{trx("{0} دقيقة", m)}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-brand-950/60">{tr("أرد عادةً خلال (أيام)")}<input type="number" min={1} max={30} value={replyDays} onChange={(e) => setReplyDays(e.target.value)} placeholder={tr("مثال: 3")} className={`${inputClass} mt-1`} />
              </label>
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-brand-500)]" />
              <span><b className="text-brand-950">{tr("أكّد الحجز تلقائيًا")}</b> <span className="text-xs text-brand-950/50">{tr("— لو اختار الفريق وقتًا من نوافذي، يتأكد مباشرة بدون ما أضغط.")}</span></span>
            </label>
            <input value={avNote} onChange={(e) => setAvNote(e.target.value)} maxLength={300} placeholder={tr("ملاحظة للفريق (اختياري): مثل «أفضّل الرسائل الصباحية»")} aria-label={tr("ملاحظة للفريق")} className={inputClass} />
            <button onClick={saveAvailability} disabled={busy === "availability"} className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-500/30 disabled:opacity-50">
              {busy === "availability" ? <Loader2 size={14} className="animate-spin" /> : savedAt ? <Check size={14} /> : <Clock size={14} />}
              {savedAt ? tr("انحفظت") : tr("حفظ أوقاتي")}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
