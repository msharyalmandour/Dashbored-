import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import AgentOrb from "../components/ui/AgentOrb";
import LoadingButton from "../components/ui/LoadingButton";
import { ResearchHeader, glassCard, pillField } from "../components/ui/researchUi";
import { useAuth } from "../context/AuthContext";
import { useMinutesActions } from "../hooks/useMinutesActions";
import { addDaysISO, formatDateFull, formatHijri, isValidISODate } from "../lib/date";

interface ActionRow {
  key: number;
  text: string;
  assigneeId: string;
  dueDate: string;
}

interface Draft {
  step: number;
  meetingDate: string;
  attendeeIds: string[];
  agenda: string;
  discussion: string;
  decisions: string;
  rows: ActionRow[];
  sendToSupervisor: boolean;
}

const DRAFT_KEY = "wesync.minutes.draft";
const STEPS = ["التاريخ والحاضرون", "وش ناقشتم والقرارات", "البنود المطلوبة"];
const fieldBox = `${pillField} !rounded-2xl`;
let rowKey = Date.now();

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

/** صفحة «محضر جديد»: ٣ خطوات، كل خطوة شاشة، والمسودة تنحفظ بمتصفحكم أول بأول (ما تروح لو سكّرتوا الصفحة) */
export default function MinutesNew() {
  const { currentUser, canWrite } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const a = useMinutesActions();
  const { today, roster, readiness } = a;

  const [init] = useState(() => loadDraft());
  const [step, setStep] = useState(init?.step ?? 1);
  const [meetingDate, setMeetingDate] = useState(init?.meetingDate ?? today);
  const [attendeeIds, setAttendeeIds] = useState<string[]>(init?.attendeeIds ?? []);
  const [agenda, setAgenda] = useState(init?.agenda ?? (location.state as { agendaSeed?: string } | null)?.agendaSeed ?? "");
  const [discussion, setDiscussion] = useState(init?.discussion ?? "");
  const [decisions, setDecisions] = useState(init?.decisions ?? "");
  const [rows, setRows] = useState<ActionRow[]>(init?.rows ?? []);
  const [sendToSupervisor, setSendToSupervisor] = useState(init?.sendToSupervisor ?? true);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [dismissedHint, setDismissedHint] = useState(false);
  const finished = useRef(false);

  // حفظ تلقائي للمسودة
  useEffect(() => {
    if (saving || finished.current) return;
    const empty = !agenda && !discussion && !decisions && rows.length === 0 && attendeeIds.length === 0;
    try {
      if (empty && step === 1) localStorage.removeItem(DRAFT_KEY);
      else localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, meetingDate, attendeeIds, agenda, discussion, decisions, rows, sendToSupervisor } satisfies Draft));
    } catch {
      // بدون تخزين محلي: تشتغل الصفحة بدون مسودة
    }
    setDraftSaved(true);
    const t = setTimeout(() => setDraftSaved(false), 1500);
    return () => clearTimeout(t);
  }, [step, meetingDate, attendeeIds, agenda, discussion, decisions, rows, sendToSupervisor, saving]);

  if (!canWrite) return <Navigate to="/meeting-minutes" replace />;

  const dateProblem = !isValidISODate(meetingDate)
    ? "اختاروا تاريخ اجتماع صحيح."
    : meetingDate > today
      ? "المحضر يُسجَّل بعد الاجتماع — تاريخه ما يكون بالمستقبل."
      : null;
  const presets = [
    { label: "اليوم", value: today },
    { label: "أمس", value: addDaysISO(today, -1) },
    { label: "قبل يومين", value: addDaysISO(today, -2) },
  ];
  const canNext = step === 1 ? !dateProblem : step === 2 ? discussion.trim().length > 0 : true;

  const addRow = () =>
    setRows((r) => [...r, { key: rowKey++, text: "", assigneeId: currentUser?.id ?? "", dueDate: addDaysISO(isValidISODate(meetingDate) ? meetingDate : today, 7) }]);
  const patchRow = (key: number, patch: Partial<ActionRow>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const submit = async () => {
    if (saving || !discussion.trim() || dateProblem) return;
    setSaving(true);
    setFailed(false);
    setError(null);
    const r = await a.handleSubmit({
      meetingDate,
      agenda,
      attendeeIds,
      discussion,
      decisions,
      actions: rows.filter((x) => x.text.trim()).map((x) => ({ text: x.text.trim(), assigneeId: x.assigneeId, dueDate: x.dueDate })),
      sendToSupervisor,
    });
    setSaving(false);
    if (r.error || !r.saved) {
      setFailed(true);
      setError(r.error ?? "تعذّر حفظ المحضر — حاولوا مرة ثانية.");
      return;
    }
    finished.current = true;
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // مو مشكلة
    }
    // نترك ثانية قصيرة تبيّن «✓ انحفظ» قبل الرجوع
    setTimeout(() => navigate("/meeting-minutes", { state: { justSaved: r.saved } }), 900);
  };

  const hint = step === 2 && !agenda.trim() && readiness.agendaText && !dismissedHint;

  return (
    <div className="mx-auto max-w-[760px] space-y-6">
      <Link to="/meeting-minutes" className="inline-flex items-center gap-1.5 text-sm text-[#B8ADA2] hover:text-[#F4F0EC]">
        <ArrowRight size={14} />
        الاجتماعات
      </Link>
      <ResearchHeader title="محضر جديد" subtitle="اكتبوا بإيجاز، والبنود تتحول لمهام بمسؤول وموعد." />

      <ol className="flex items-center gap-2" aria-label="الخطوات">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const on = n === step;
          return (
            <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
              <button
                type="button"
                onClick={() => done && setStep(n)}
                disabled={!done}
                aria-current={on ? "step" : undefined}
                className="flex items-center gap-2.5 disabled:cursor-default"
              >
                <span
                  className={clsx(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-colors",
                    on ? "border-transparent bg-gradient-to-l from-[#FFB444] to-[#FF6B00] text-[#1A0F00]" : done ? "border-[#7fd6a0]/60 bg-[#7fd6a0]/15 text-[#7fd6a0]" : "border-white/20 text-[#B8ADA2]",
                  )}
                >
                  {done ? <Check size={15} strokeWidth={3} /> : n}
                </span>
                <span className={clsx("hidden text-sm sm:block", on ? "font-bold text-[#F4F0EC]" : "text-[#B8ADA2]")}>{label}</span>
              </button>
              {n < STEPS.length && <span aria-hidden className={clsx("h-px flex-1", done ? "bg-[#7fd6a0]/50" : "bg-white/15")} />}
            </li>
          );
        })}
      </ol>

      <section className={clsx(glassCard, "space-y-5 p-6 sm:p-8")}>
        {step === 1 && (
          <>
            <div>
              <label htmlFor="meeting-date" className="mb-2 block text-sm font-semibold">
                تاريخ الاجتماع
              </label>
              <input id="meeting-date" type="date" value={meetingDate} max={today} onChange={(e) => setMeetingDate(e.target.value)} aria-invalid={!!dateProblem} className={clsx(fieldBox, dateProblem && "!border-rose-400")} />
              <div className="mt-2.5 flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setMeetingDate(p.value)}
                    className={clsx(
                      "rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors",
                      meetingDate === p.value ? "border-[#FF8A24]/70 bg-[#FF6B00]/15 text-[#FFB444]" : "border-white/[0.14] text-[#B8ADA2] hover:text-[#F4F0EC]",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className={clsx("mt-2 text-xs", dateProblem ? "font-semibold text-rose-400" : "text-[#B8ADA2]")} aria-live="polite">
                {dateProblem ?? (
                  <>
                    {formatDateFull(meetingDate)}
                    {formatHijri(meetingDate) && <> · {formatHijri(meetingDate)}</>}
                  </>
                )}
              </p>
            </div>
            <div>
              <span className="mb-2 block text-sm font-semibold">الحاضرون</span>
              <div className="flex flex-wrap gap-2.5">
                {roster.map((m) => {
                  const on = attendeeIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setAttendeeIds((p) => (on ? p.filter((x) => x !== m.id) : [...p, m.id]))}
                      className={clsx(
                        "flex items-center gap-2 rounded-full border py-1.5 ps-1.5 pe-4 text-sm transition-colors",
                        on ? "border-[#FF8A24]/70 bg-[#FF6B00]/15 text-[#FFB444]" : "border-white/[0.14] text-[#B8ADA2] hover:text-[#F4F0EC]",
                      )}
                    >
                      <span className={clsx("flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold", on ? "border-[#FFB444]" : "border-white/25")}>{m.name.trim().charAt(0)}</span>
                      {m.name.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {hint && (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#FF8A24]/30 bg-[#FF6B00]/[0.06] p-3.5">
                <AgentOrb size={34} />
                <p className="min-w-0 flex-1 text-sm">عندكم جدول أعمال جاهز، تبغون نعبّي النقاط منه؟</p>
                <button
                  type="button"
                  onClick={() => setAgenda(readiness.agendaText)}
                  className="rounded-full bg-gradient-to-l from-[#FFB444] to-[#FF6B00] px-4 py-1.5 text-xs font-bold text-[#1A0F00]"
                >
                  نعم، عبّوها
                </button>
                <button type="button" onClick={() => setDismissedHint(true)} className="text-xs text-[#B8ADA2] hover:text-[#F4F0EC]">
                  لا، شكراً
                </button>
              </div>
            )}
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                جدول الأعمال <span className="font-normal text-[#8F8378]">(اختياري)</span>
              </span>
              <textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={agenda ? 5 : 2} className={fieldBox} placeholder="وش كنتم ناوين تناقشون؟" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">وش ناقشتم؟</span>
              <textarea value={discussion} onChange={(e) => setDiscussion(e.target.value)} rows={4} className={fieldBox} placeholder="أبرز النقاط اللي تناقشتم فيها بالاجتماع" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">القرارات</span>
              <textarea value={decisions} onChange={(e) => setDecisions(e.target.value)} rows={3} className={fieldBox} placeholder="القرارات اللي اتفقتوا عليها" />
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">البنود المطلوبة</p>
                <p className="text-xs text-[#B8ADA2]">كل بند يتحول لمهمة بمسؤول وموعد، وتتابعون إنجازها.</p>
              </div>
              <button type="button" onClick={addRow} className="flex shrink-0 items-center gap-1 rounded-full border border-[#FF8A24]/50 px-3.5 py-1.5 text-xs font-bold text-[#FFB444] hover:bg-[#FF6B00]/10">
                <Plus size={13} />
                أضيفوا بند
              </button>
            </div>
            {rows.length === 0 ? (
              <p className="rounded-2xl bg-white/[0.04] p-4 text-sm text-[#B8ADA2]">ما فيه بنود. تقدرون تحفظون المحضر بدونها، أو تضيفون بنود تتحول لمهام.</p>
            ) : (
              <ul className="space-y-2.5">
                {rows.map((r) => (
                  <li key={r.key} className="grid grid-cols-1 gap-2 rounded-2xl bg-white/[0.04] p-3 sm:grid-cols-[1fr_9rem_9rem_auto]">
                    <input value={r.text} onChange={(e) => patchRow(r.key, { text: e.target.value })} placeholder="وش المطلوب؟" aria-label="نص البند" className={fieldBox} />
                    <select value={r.assigneeId} onChange={(e) => patchRow(r.key, { assigneeId: e.target.value })} aria-label="المسؤول" className={fieldBox}>
                      {roster.map((m) => (
                        <option key={m.id} value={m.id} className="text-black">
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <input type="date" value={r.dueDate} onChange={(e) => patchRow(r.key, { dueDate: e.target.value })} aria-label="الموعد" className={fieldBox} />
                    <button type="button" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))} aria-label="حذف البند" className="grid place-items-center rounded-full px-2.5 text-[#B8ADA2] hover:bg-rose-500/10 hover:text-rose-400">
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white/[0.04] p-4 text-sm">
              <input type="checkbox" checked={sendToSupervisor} onChange={(e) => setSendToSupervisor(e.target.checked)} className="mt-1 h-4 w-4 accent-[#FF6B00]" />
              <span>
                <span className="block font-bold">أرسلوه للمشرف/ة للاعتماد</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[#B8ADA2]">تعتمده بضغطة وحدة من رابطها بدون تسجيل دخول. ولو ما ردّت خلال ٤٨ ساعة يُحسب معتمدًا تلقائيًا، فما يتعطل شغلكم.</span>
              </span>
            </label>
            {error && (
              <p role="alert" className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-300">
                {error}
              </p>
            )}
          </>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-5">
          {step > 1 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded-full border border-white/[0.14] px-5 py-2.5 text-sm font-semibold text-[#B8ADA2] hover:text-[#F4F0EC]">
              السابق
            </button>
          ) : (
            <span />
          )}
          <span className={clsx("text-[11px] text-[#B8ADA2] transition-opacity", draftSaved ? "opacity-100" : "opacity-0")} aria-live="polite">
            المسودة محفوظة
          </span>
          {step < 3 ? (
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-l from-[#FFB444] to-[#FF6B00] px-7 py-2.5 text-sm font-bold text-[#1A0F00] shadow-[0_8px_28px_-8px_#FF6B00] transition hover:brightness-110 disabled:opacity-50"
            >
              التالي
            </button>
          ) : (
            <LoadingButton loading={saving} error={failed} loadingText="جاري الحفظ…" onClick={submit} disabled={!discussion.trim() || !!dateProblem}>
              حفظ المحضر
            </LoadingButton>
          )}
        </div>
      </section>
    </div>
  );
}
