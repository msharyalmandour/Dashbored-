import { useState } from "react";
import { CalendarDays, Check, ListChecks, Loader2, NotebookPen, Plus, Send, Trash2, Users2 } from "lucide-react";
import Card from "../ui/Card";
import { addDaysISO, formatDateFull, formatHijri, isValidISODate, toISODate } from "../../lib/date";

export interface MinutesFormPayload {
  meetingDate: string;
  agenda: string;
  attendeeIds: string[];
  discussion: string;
  decisions: string;
  actions: { text: string; assigneeId: string; dueDate: string }[];
  sendToSupervisor: boolean;
}

interface MinutesFormProps {
  roster: { id: string; name: string }[];
  currentUserId: string;
  /** لما يتغيّر n ننسخ النص لخانة جدول الأعمال (زر «استخدموه كجدول أعمال») */
  agendaSeed: { text: string; n: number } | null;
  /** يرجّع رسالة خطأ أو null لو نجح الحفظ */
  onSubmit: (payload: MinutesFormPayload) => Promise<string | null>;
}

interface ActionRow {
  key: number;
  text: string;
  assigneeId: string;
  dueDate: string;
}

const inputClass = "w-full rounded-xl border border-brand-100 bg-paper/60 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand-300";
let rowKey = 0;

export default function MinutesForm({ roster, currentUserId, agendaSeed, onSubmit }: MinutesFormProps) {
  const today = toISODate(new Date());
  const [meetingDate, setMeetingDate] = useState(today);
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [agenda, setAgenda] = useState("");
  const [discussion, setDiscussion] = useState("");
  const [decisions, setDecisions] = useState("");
  const [rows, setRows] = useState<ActionRow[]>([]);
  const [sendToSupervisor, setSendToSupervisor] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ننسخ جدول الأعمال القادم من الزر مرة وحدة لكل ضغطة (نمط «ضبط الحالة أثناء الرسم» الموصى به)
  const [appliedSeed, setAppliedSeed] = useState(0);
  if (agendaSeed && agendaSeed.n !== appliedSeed) {
    setAppliedSeed(agendaSeed.n);
    setAgenda(agendaSeed.text);
  }

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

  const addRow = () => setRows((r) => [...r, { key: rowKey++, text: "", assigneeId: currentUserId, dueDate: addDaysISO(isValidISODate(meetingDate) ? meetingDate : today, 7) }]);
  const patchRow = (key: number, patch: Partial<ActionRow>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const submit = async () => {
    if (saving || !discussion.trim()) return;
    if (dateProblem) {
      setError(dateProblem);
      return;
    }
    setError(null);
    setSaving(true);
    const err = await onSubmit({
      meetingDate,
      agenda,
      attendeeIds,
      discussion,
      decisions,
      actions: rows.filter((r) => r.text.trim()).map((r) => ({ text: r.text.trim(), assigneeId: r.assigneeId, dueDate: r.dueDate })),
      sendToSupervisor,
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setMeetingDate(today);
    setAttendeeIds([]);
    setAgenda("");
    setDiscussion("");
    setDecisions("");
    setRows([]);
  };

  return (
    <Card tone="cream" className="relative overflow-hidden !p-0">
      <div aria-hidden className="pointer-events-none absolute -top-16 -end-10 h-44 w-44 rounded-full bg-brand-500/15 blur-3xl" />
      <div className="relative space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-3.5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/25 ring-1 ring-white/20">
            <NotebookPen size={22} />
          </span>
          <div>
            <h3 className="font-display text-base font-extrabold text-brand-950">محضر اجتماع جديد</h3>
            <p className="mt-0.5 text-xs text-brand-950/55">اكتبوا بإيجاز، والبنود تتحول لمهام بمسؤول وموعد.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="text-sm">
            <label htmlFor="meeting-date" className="mb-1 flex items-center gap-1.5 font-semibold text-brand-950/70">
              <CalendarDays size={14} />
              تاريخ الاجتماع
            </label>
            <input id="meeting-date" type="date" value={meetingDate} max={today} onChange={(e) => setMeetingDate(e.target.value)} aria-invalid={!!dateProblem} className={`${inputClass} ${dateProblem ? "!border-rose-300" : ""}`} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button key={p.label} type="button" onClick={() => setMeetingDate(p.value)} className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${meetingDate === p.value ? "bg-brand-500 text-white" : "bg-surface-muted text-brand-950/60 hover:bg-brand-50"}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <p className={`mt-2 text-xs leading-relaxed ${dateProblem ? "font-semibold text-rose-600" : "text-brand-950/55"}`} aria-live="polite">
              {dateProblem ?? (
                <>
                  {formatDateFull(meetingDate)}
                  {formatHijri(meetingDate) && <> · {formatHijri(meetingDate)}</>}
                </>
              )}
            </p>
          </div>

          <div className="text-sm">
            <span className="mb-1 flex items-center gap-1.5 font-semibold text-brand-950/70">
              <Users2 size={14} />
              الحاضرون
            </span>
            <div className="flex flex-wrap gap-1.5">
              {roster.map((m) => (
                <button key={m.id} type="button" onClick={() => setAttendeeIds((p) => (p.includes(m.id) ? p.filter((x) => x !== m.id) : [...p, m.id]))} className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${attendeeIds.includes(m.id) ? "bg-brand-500 text-white" : "bg-surface-muted text-brand-950/60 hover:bg-brand-50"}`}>
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-semibold text-brand-950/70">جدول الأعمال <span className="font-normal text-brand-950/40">(اختياري — جاهز من بطاقة «جاهزية الاجتماع»)</span></span>
            <textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={agenda ? 5 : 2} className={inputClass} placeholder="وش كنتم ناوين تناقشون؟" />
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-semibold text-brand-950/70">ماذا ناقشنا</span>
            <textarea value={discussion} onChange={(e) => setDiscussion(e.target.value)} rows={3} className={inputClass} placeholder="أبرز النقاط اللي انناقشت بالاجتماع" />
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-semibold text-brand-950/70">القرارات</span>
            <textarea value={decisions} onChange={(e) => setDecisions(e.target.value)} rows={2} className={inputClass} placeholder="القرارات اللي اتفقنا عليها" />
          </label>
        </div>

        <div className="rounded-2xl border border-brand-100/70 bg-paper/40 p-3.5">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-extrabold text-brand-950/80">
              <ListChecks size={15} className="text-brand-500" />
              البنود المطلوبة
            </p>
            <button type="button" onClick={addRow} className="flex items-center gap-1 rounded-full border border-brand-100 px-3 py-1 text-xs font-bold text-brand-700 hover:bg-surface-muted">
              <Plus size={13} />
              أضيفوا بند
            </button>
          </div>
          {rows.length === 0 ? (
            <p className="text-xs leading-relaxed text-brand-950/50">كل بند يتحول لمهمة فعلية بمسؤول وموعد، وتتابعون إنجازها، وتطلع للمشرف/ة نسبة الإنجاز.</p>
          ) : (
            <ul className="space-y-2.5">
              {rows.map((r) => (
                <li key={r.key} className="grid grid-cols-1 gap-2 rounded-xl border border-brand-100/60 p-2.5 sm:grid-cols-[1fr_9rem_9rem_auto]">
                  <input value={r.text} onChange={(e) => patchRow(r.key, { text: e.target.value })} placeholder="وش المطلوب؟" aria-label="نص البند" className={inputClass} />
                  <select value={r.assigneeId} onChange={(e) => patchRow(r.key, { assigneeId: e.target.value })} aria-label="المسؤول" className={inputClass}>
                    {roster.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <input type="date" value={r.dueDate} onChange={(e) => patchRow(r.key, { dueDate: e.target.value })} aria-label="الموعد" className={inputClass} />
                  <button type="button" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))} aria-label="حذف البند" className="grid place-items-center rounded-xl px-2.5 text-brand-950/40 hover:bg-rose-500/10 hover:text-rose-500">
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-brand-100/70 bg-paper/40 p-3.5 text-sm">
          <input type="checkbox" checked={sendToSupervisor} onChange={(e) => setSendToSupervisor(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-brand-500)]" />
          <span>
            <span className="flex items-center gap-1.5 font-extrabold text-brand-950/80">
              <Send size={14} className="text-brand-500" />
              أرسلوه للمشرف/ة للاعتماد
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-brand-950/55">تعتمده بضغطة وحدة من رابطها بدون تسجيل دخول. ولو ما ردّت خلال ٤٨ ساعة يُحسب معتمدًا تلقائيًا، فما يتعطل شغلكم.</span>
          </span>
        </label>

        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">{error}</p>}

        <button onClick={submit} disabled={saving || !discussion.trim() || !!dateProblem} className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-brand-500/25 transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 motion-reduce:transition-none">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {saving ? "جاري الحفظ..." : "حفظ المحضر"}
        </button>
      </div>
    </Card>
  );
}
