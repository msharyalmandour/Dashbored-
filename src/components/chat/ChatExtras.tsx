import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BellRing, BookOpen, CalendarCheck, CalendarX, CheckCircle2, FileCheck2, FilePen, HelpCircle, MessageSquareQuote, PenLine, Vote } from "lucide-react";
import Dialog from "../ui/Dialog";
import Avatar from "../ui/Avatar";
import PaperReaderCard from "../research/PaperReaderCard";
import { insertEvidencePaper } from "../../hooks/useEvidencePapers";
import type { ChatMessage } from "../../hooks/useTeamChat";
import type { TeamMember } from "../../data/types";
import { addDaysISO, formatDateShort, toISODate } from "../../lib/date";
import { tr } from "../../lib/i18n";

const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? "";

/* ══ حدث بالموقع: سطر هادي بالنص مع أيقونة ورابط (مو فقاعة) ══ */
export function EventRow({ m, nameOf, time }: { m: ChatMessage; nameOf: (id: string) => string; time: string }) {
  const meta = m.meta ?? {};
  const t = String(meta.type ?? "");
  const actor = m.authorId ? nameOf(m.authorId) : "";
  const by = String(meta.by ?? "").trim() || tr("المشرف/ة");
  let icon: ReactNode = <CheckCircle2 size={16} aria-hidden />;
  let text = m.body;
  let to = "";
  let detail = "";
  if (t === "task_done") {
    text = tr("{0} خلّص مهمة «{1}» ✓", actor, String(meta.title ?? ""));
    to = `/tasks?task=${meta.task_id}`;
  } else if (t === "paper_added") {
    icon = <BookOpen size={16} aria-hidden />;
    text = tr("{0} أضاف دراسة «{1}»", actor, String(meta.title ?? ""));
    to = "/evidence";
  } else if (t === "minutes_approved") {
    icon = <FileCheck2 size={16} aria-hidden />;
    text = tr("{0} اعتمد/ت المحضر", by);
    to = "/meeting-minutes";
  } else if (t === "minutes_changes_requested") {
    icon = <FilePen size={16} aria-hidden />;
    text = tr("{0} طلب/ت تعديل على المحضر", by);
    detail = String(meta.note ?? "");
    to = "/meeting-minutes";
  } else if (t === "decision_answered") {
    icon = <HelpCircle size={16} aria-hidden />;
    text = tr("{0} جاوب/ت: «{1}»", by, String(meta.question ?? ""));
    detail = [meta.answer ? tr("القرار: {0}", String(meta.answer)) : "", String(meta.note ?? "")].filter(Boolean).join(" — ");
    to = "/meeting-minutes?tab=decisions";
  } else if (t === "booking_confirmed" || t === "booking_declined") {
    icon = t === "booking_confirmed" ? <CalendarCheck size={16} aria-hidden /> : <CalendarX size={16} aria-hidden />;
    text = t === "booking_confirmed" ? tr("{0} أكد/ت الموعد {1} الساعة {2}", by, formatDateShort(String(meta.date ?? "")), String(meta.time ?? "")) : tr("{0} اعتذر/ت عن موعد {1}", by, formatDateShort(String(meta.date ?? "")));
    detail = String(meta.note ?? "");
    to = "/meeting-minutes?tab=appointments";
  } else if (t === "supervisor_message") {
    icon = <MessageSquareQuote size={16} aria-hidden />;
    text = tr("رسالة جديدة من {0}", by);
    detail = String(meta.excerpt ?? "");
    to = "/feedback";
  } else if (t === "section_comment") {
    icon = <PenLine size={16} aria-hidden />;
    text = tr("{0} علّق/ت على «{1}»", by, String(meta.label ?? ""));
    detail = String(meta.excerpt ?? "");
    to = `/proposal?section=${meta.section_key}`;
  }
  const inner = (
    <>
      <span className="tc-ev-ic">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="tc-ev-t">{text}</span>
        {detail && <span className="tc-ev-d">{detail}</span>}
      </span>
      <span className="tc-ev-time">{time}</span>
    </>
  );
  return to ? (
    <Link to={to} className="tc-event">
      {inner}
    </Link>
  ) : (
    <div className="tc-event">{inner}</div>
  );
}

/* ══ ملخص اليوم: كرت ثابت فوق المحادثة من أحداث اليوم ══ */
export function TodaySummary({ messages, openDecisions, pendingMinutes }: { messages: ChatMessage[]; openDecisions: number; pendingMinutes: number }) {
  const today = toISODate(new Date());
  const ev = messages.filter((m) => m.kind === "event" && toISODate(new Date(m.createdAt)) === today);
  const done = ev.filter((m) => m.meta?.type === "task_done").length;
  const papers = ev.filter((m) => m.meta?.type === "paper_added").length;
  const sup = ev.filter((m) => /^(minutes_|decision_|booking_|supervisor_|section_)/.test(String(m.meta?.type ?? ""))).length;
  const waiting = openDecisions + pendingMinutes;
  const bits = [
    done ? tr("{0} مهام خلصت", done) : "",
    papers ? tr("{0} دراسة جديدة", papers) : "",
    sup ? tr("{0} رد من المشرف/ة", sup) : "",
    waiting ? tr("{0} ينتظر المشرف/ة", waiting) : "",
  ].filter(Boolean);
  if (bits.length === 0) return null;
  return (
    <div className="tc-today" role="status">
      <b>{tr("اليوم بالفريق")}</b>
      <span>{bits.join(" · ")}</span>
    </div>
  );
}

/* ══ رد الوكيل داخل المحادثة ══ */
export function AgentMark() {
  return (
    <span className="tc-agent-av" aria-hidden>
      <svg width="16" height="16" viewBox="0 0 26 26">
        <g fill="#FF9A3C">
          <rect x="4" y="10" width="3" height="6" rx="1.5" />
          <rect x="9.2" y="6" width="3" height="14" rx="1.5" />
          <rect x="14.4" y="3.5" width="3" height="19" rx="1.5" />
          <rect x="19.6" y="8.5" width="3" height="9" rx="1.5" />
        </g>
      </svg>
    </span>
  );
}

/* ══ تصويت ══ */
export function PollCard({
  m,
  votes,
  roster,
  me,
  canClose,
  onVote,
  onClose,
}: {
  m: ChatMessage;
  votes: Record<string, number>;
  roster: TeamMember[];
  me: string;
  canClose: boolean;
  onVote: (i: number) => void;
  onClose: (winner: number) => void;
}) {
  const options = (m.meta?.options as string[] | undefined) ?? [];
  const closed = !!m.meta?.closed;
  const winner = typeof m.meta?.winner === "number" ? (m.meta.winner as number) : -1;
  const total = Object.keys(votes).length;
  const counts = options.map((_, i) => Object.values(votes).filter((v) => v === i).length);
  const top = counts.indexOf(Math.max(...counts, 0));
  return (
    <div className="tc-poll">
      <span className="tc-ref-k flex items-center gap-1">
        <Vote size={14} aria-hidden />
        {closed ? tr("تصويت · انحسم") : tr("تصويت · {0} صوّتوا", total)}
      </span>
      <b className="tc-poll-q">{m.body}</b>
      <div className="flex flex-col gap-1.5" role="group" aria-label={m.body}>
        {options.map((o, i) => {
          const pct = total ? Math.round((counts[i] / total) * 100) : 0;
          const mine = votes[me] === i;
          const voters = roster.filter((r) => votes[r.id] === i);
          return (
            <button key={i} type="button" className={`tc-poll-opt${mine ? " mine" : ""}${closed && winner === i ? " win" : ""}`} aria-pressed={mine} disabled={closed} onClick={() => onVote(i)}>
              <span className="tc-poll-bar" style={{ width: `${pct}%` }} aria-hidden />
              <span className="relative z-[1] min-w-0 flex-1 truncate text-start" dir="auto">
                {o}
              </span>
              <span className="relative z-[1] flex items-center">
                {voters.slice(0, 3).map((v) => (
                  <span key={v.id} className="-ms-1.5 first:ms-0">
                    <Avatar initials="" name={v.name} avatar={v.avatar} px={20} />
                  </span>
                ))}
              </span>
              <span className="relative z-[1] w-9 text-end text-[12px] font-bold text-[#ABA095]" dir="ltr">
                {pct}%
              </span>
            </button>
          );
        })}
      </div>
      {canClose && !closed && total > 0 && (
        <button type="button" className="tc-ghost self-start !px-0 text-[#FFC777]" onClick={() => onClose(top)}>
          {tr("اعتمدوا «{0}» قرار", options[top] ?? "")}
        </button>
      )}
    </div>
  );
}

export function PollComposer({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (q: string, options: string[]) => Promise<boolean> }) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  const [busy, setBusy] = useState(false);
  const clean = opts.map((o) => o.trim()).filter(Boolean);
  return (
    <Dialog open={open} onClose={onClose} title={tr("تصويت سريع")}>
      <div className="flex flex-col gap-3">
        <label>
          <span className="tc-label">{tr("السؤال")}</span>
          <input className="tc-field" value={q} onChange={(e) => setQ(e.target.value)} maxLength={200} placeholder={tr("مثلًا: أي عنوان أحسن؟")} />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="tc-label">{tr("الخيارات")}</legend>
          {opts.map((o, i) => (
            <input key={i} className="tc-field" value={o} maxLength={120} onChange={(e) => setOpts(opts.map((x, j) => (j === i ? e.target.value : x)))} placeholder={tr("الخيار {0}", i + 1)} aria-label={tr("الخيار {0}", i + 1)} />
          ))}
          {opts.length < 6 && (
            <button type="button" className="tc-ghost self-start !px-0 text-[#FFC777]" onClick={() => setOpts([...opts, ""])}>
              {tr("+ خيار ثاني")}
            </button>
          )}
        </fieldset>
        <button
          type="button"
          className="tc-primary w-full"
          disabled={busy || q.trim().length < 3 || clean.length < 2}
          onClick={async () => {
            setBusy(true);
            const ok = await onCreate(q.trim(), clean);
            setBusy(false);
            if (ok) {
              setQ("");
              setOpts(["", ""]);
            }
          }}
        >
          {busy ? tr("لحظة…") : tr("أرسلوا التصويت")}
        </button>
      </div>
    </Dialog>
  );
}

/* ══ رسالة ← اقتراح موعد للمشرف/ة ══ */
function guessDate(text: string): string {
  const today = toISODate(new Date());
  if (/بكر[ةا]|بكرى/.test(text)) return addDaysISO(today, 1);
  const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const i = days.findIndex((d) => text.includes(d) || text.includes(d.replace("ال", "")));
  if (i >= 0) {
    const now = new Date();
    const diff = (i - now.getDay() + 7) % 7 || 7;
    return addDaysISO(today, diff);
  }
  return addDaysISO(today, 3);
}
function guessTime(text: string): string {
  const m = text.match(/(\d{1,2})(?::(\d{2}))?\s*(الصبح|ص|الظهر|العصر|المغرب|م|الليل)?/);
  if (!m) return "10:00";
  let h = Number(m[1]);
  if (h > 23) return "10:00";
  const pm = m[3] && /الظهر|العصر|المغرب|م|الليل/.test(m[3]);
  if ((pm && h < 12) || (!m[3] && h >= 1 && h <= 6)) h += 12;
  return `${String(h).padStart(2, "0")}:${m[2] ?? "00"}`;
}

export function BookingSheet({ msg, onClose, onBook }: { msg: ChatMessage; onClose: () => void; onBook: (date: string, time: string, note: string) => Promise<boolean> }) {
  const [date, setDate] = useState(() => guessDate(msg.body));
  const [time, setTime] = useState(() => guessTime(msg.body));
  const [note, setNote] = useState(() => msg.body.slice(0, 280));
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onClose={onClose} title={tr("اقترحوه موعد للمشرف/ة")}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="tc-label">{tr("اليوم")}</span>
            <input type="date" className="tc-field" value={date} min={toISODate(new Date())} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            <span className="tc-label">{tr("الساعة")}</span>
            <input type="time" className="tc-field" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
        <label>
          <span className="tc-label">{tr("ملاحظة لها")}</span>
          <textarea className="tc-field !min-h-[88px] py-3" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button
          type="button"
          className="tc-primary w-full"
          disabled={busy || !date || !/^\d{2}:\d{2}$/.test(time)}
          onClick={async () => {
            setBusy(true);
            if (!(await onBook(date, time, note.trim()))) setBusy(false);
          }}
        >
          {busy ? tr("لحظة…") : tr("أرسلوا الاقتراح")}
        </button>
        <p className="tc-help">{tr("يوصلها بصفحتها (وإيميلها لو مفعّل)، وتأكيدها ينزل هنا بالمحادثة.")}</p>
      </div>
    </Dialog>
  );
}

/* ══ رسالة ← سؤال للمشرف/ة بخيارات ══ */
export function SupervisorQuestionSheet({ msg, onClose, onAsk }: { msg: ChatMessage; onClose: () => void; onAsk: (question: string, options: string[]) => Promise<boolean> }) {
  const [q, setQ] = useState(() => msg.body.replace(/@\S+/g, "").replace(/\s+/g, " ").trim().slice(0, 400));
  const [opts, setOpts] = useState(["", ""]);
  const [busy, setBusy] = useState(false);
  const clean = opts.map((o) => o.trim()).filter(Boolean);
  return (
    <Dialog open onClose={onClose} title={tr("أرسلوها سؤال للمشرف/ة")}>
      <div className="flex flex-col gap-3">
        <label>
          <span className="tc-label">{tr("السؤال")}</span>
          <textarea className="tc-field !min-h-[80px] py-3" value={q} maxLength={400} onChange={(e) => setQ(e.target.value)} />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="tc-label">{tr("الخيارات (تختار وحدة بضغطة)")}</legend>
          {opts.map((o, i) => (
            <input key={i} className="tc-field" value={o} maxLength={120} onChange={(e) => setOpts(opts.map((x, j) => (j === i ? e.target.value : x)))} placeholder={tr("الخيار {0}", i + 1)} aria-label={tr("الخيار {0}", i + 1)} />
          ))}
          {opts.length < 4 && (
            <button type="button" className="tc-ghost self-start !px-0 text-[#FFC777]" onClick={() => setOpts([...opts, ""])}>
              {tr("+ خيار ثاني")}
            </button>
          )}
        </fieldset>
        <button
          type="button"
          className="tc-primary w-full"
          disabled={busy || q.trim().length < 3 || clean.length < 2}
          onClick={async () => {
            setBusy(true);
            if (!(await onAsk(q.trim(), clean))) setBusy(false);
          }}
        >
          {busy ? tr("لحظة…") : tr("أرسلوه للمشرف/ة")}
        </button>
        <p className="tc-help">{tr("تجاوب بضغطة من صفحتها، وجوابها ينزل هنا بالمحادثة ويتحفظ بالقرارات.")}</p>
      </div>
    </Dialog>
  );
}

/* ══ «ذكّروني» ══ */
export function ReminderSheet({ msg, onClose, onRemind }: { msg: ChatMessage; onClose: () => void; onRemind: (at: Date) => Promise<boolean> }) {
  const [busy, setBusy] = useState(false);
  const at = (kind: "hour" | "tonight" | "tomorrow" | "week") => {
    const d = new Date();
    if (kind === "hour") d.setHours(d.getHours() + 1);
    else if (kind === "tonight") {
      d.setHours(21, 0, 0, 0);
      if (d.getTime() < Date.now() + 15 * 60e3) d.setDate(d.getDate() + 1);
    } else if (kind === "tomorrow") {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else {
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
    }
    return d;
  };
  const opts = [
    ["hour", tr("بعد ساعة")],
    ["tonight", tr("الليلة 9")],
    ["tomorrow", tr("بكرا 9 الصبح")],
    ["week", tr("بعد أسبوع")],
  ] as const;
  return (
    <Dialog open onClose={onClose} title={tr("ذكّروني")}>
      <div className="flex flex-col gap-3">
        <div className="tc-sheet-q">
          <span className="line-clamp-2">{msg.body}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {opts.map(([k, label]) => (
            <button
              key={k}
              type="button"
              className="tc-chip justify-center"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                if (!(await onRemind(at(k)))) setBusy(false);
              }}
            >
              <BellRing size={15} aria-hidden />
              {label}
            </button>
          ))}
        </div>
        <p className="tc-help">{tr("يجيكم إشعار بالجوال بالوقت هذا (لازم الإشعارات مفعّلة).")}</p>
      </div>
    </Dialog>
  );
}

/* ══ ارموا دراسة بالمحادثة: الوكيل يقرأها ويحطها بالمكتبة وجدول الأدبيات ══ */
export function StudyDropSheet({ open, me, onClose, onSaved }: { open: boolean; me: string; onClose: () => void; onSaved: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={tr("ارموا دراسة")}>
      <PaperReaderCard
        compact
        onClose={onClose}
        onSave={async (p) => {
          const r = await insertEvidencePaper({ ...p, addedById: me });
          if (!r.error) onSaved();
          return r;
        }}
      />
    </Dialog>
  );
}

export { firstName as chatFirstName };
