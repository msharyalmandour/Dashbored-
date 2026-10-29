import { useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, BookOpen, Check, Clock, Flag, Gauge, PenLine, Route, Shield, Users } from "lucide-react";
import clsx from "clsx";
import AgentWave from "../ui/AgentWave";
import { PALETTE, letter, weekdayAr } from "./TeamMeetLux";
import { num } from "../v3/WriteHeader";
import type { Task } from "../../data/types";
import { openAgent } from "../../lib/agentBus";
import { arabicMonths, daysUntil, formatDateShort } from "../../lib/date";
import { isLate, todoList, weeklySeries, type TodoKind } from "../../lib/homeCalm";
import { isEn, tr } from "../../lib/i18n";

/* «الرئيسية الفخمة (زجاج + تقدّم + الوكيل)»: لوحة V3HomeGlass للكمبيوتر و MHomeGlass للجوال.
   كل الأرقام محسوبة من بيانات الفريق الحقيقية (المهام، الأقسام، الأدبيات، المنهجية، الموافقة الأخلاقية، المراحل). */

const rise = (i: number) => ({ ["--v3-i" as string]: i }) as CSSProperties;

/** عدد + المعدود: ١ قسم، ٢ قسمين، ٣–١٠ أقسام، ١١+ قسم */
export const countAr = (n: number, one: string, two: string, few: string, many: string) =>
  n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? tr(few, num(n)) : tr(many, num(n));
const daysWord = (n: number) => (n === 1 ? tr("يوم") : n === 2 ? tr("يومين") : n >= 3 && n <= 10 ? tr("أيام") : tr("يوم"));
const dayMonth = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return isEn ? formatDateShort(iso) : `${num(d.getDate())} ${arabicMonths[d.getMonth()]}`;
};

// ───────────────────────────── الترحيب ─────────────────────────────

export function GlassHeader({ firstName, now, aside }: { firstName: string; now: Date; aside?: ReactNode }) {
  const dateLine = isEn
    ? now.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })
    : `${weekdayAr(now)} ${num(now.getDate())} ${arabicMonths[now.getMonth()]}`;
  return (
    <header className="v3-rise relative mb-4 flex items-end gap-4 lg:mb-5" style={rise(0)}>
      <div className="min-w-0 flex-1">
        <div className="hg-hello">{now.getHours() < 12 ? tr("صباح الخير يا") : tr("مساء الخير يا")}</div>
        <h1 className="hg-name m-0">{firstName}</h1>
        <p className="m-0 mt-1 text-[15px] text-[#ABA095]">{tr("{0} · هذي نظرة على بحثكم", dateLine)}</p>
      </div>
      {aside}
    </header>
  );
}

/** زر الوكيل جنب الترحيب (كمبيوتر) */
export function AgentPill({ firstName }: { firstName: string }) {
  return (
    <button type="button" className="hg-card hg-pill hidden lg:flex" onClick={() => openAgent()} aria-label={tr("افتح وكيل Wesync")}>
      <span aria-hidden className="h-10 w-10 flex-none rounded-full" style={{ background: "radial-gradient(circle at 40% 35%,#FFF0C2,#FFB444 35%,#FF6A00 70%,#8A2A05)", boxShadow: "0 0 24px rgba(255,140,40,.6)" }} />
      <span className="min-w-0 flex-1 text-sm leading-normal">
        <b>{tr("هلا {0}!", `\u2068${firstName}\u2069`)}</b> <span className="text-[#ABA095]">{tr("وش أقدر أسوي لكم اليوم؟")}</span>
      </span>
      <span className="hg-pbtn !h-[38px] !w-[38px] !rounded-xl" aria-hidden>
        <AgentWave size={18} />
      </span>
    </button>
  );
}

// ───────────────────────────── وش علينا اليوم؟ (To-do) ─────────────────────────────

type Member = { id: string; name: string };

export function TodoCard({
  tasks,
  today,
  roster,
  canWrite,
  sectionTag,
  taskLink,
  onToggle,
  onAdd,
  style,
  className,
}: {
  tasks: Task[];
  today: string;
  roster: Member[];
  canWrite: boolean;
  sectionTag: (t: Task) => string;
  taskLink: (t: Task) => string;
  onToggle: (t: Task, done: boolean) => void;
  onAdd: (title: string) => Promise<boolean>;
  style?: CSSProperties;
  className?: string;
}) {
  // اللي انضغط بهالجلسة: يبقى بمكانه (ما يقفز فوق)، ويُحسب «خلص اليوم» حتى قبل ما يرجع تاريخ الإكمال من الخادم
  const [pinned, setPinned] = useState<Map<string, TodoKind>>(new Map());
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const { items, done, total } = useMemo(() => todoList(tasks, today, { doneToday: ticked, pinned, limit: 4 }), [tasks, today, ticked, pinned]);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const toggle = (t: Task, kind: TodoKind) => {
    const nowDone = t.status !== "done";
    setPinned((m) => (m.has(t.id) ? m : new Map(m).set(t.id, kind)));
    setTicked((s) => {
      const n = new Set(s);
      if (nowDone) n.add(t.id);
      else n.delete(t.id);
      return n;
    });
    onToggle(t, nowDone);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title || adding) return;
    setAdding(true);
    const ok = await onAdd(title);
    setAdding(false);
    if (ok) setDraft("");
  };

  const dueLabel = (t: Task, kind: TodoKind) => {
    if (kind === "done") return { text: tr("خلصت ✓"), color: "#7FE0A6" };
    if (kind === "late") {
      const n = -daysUntil(t.dueDate, new Date(`${today}T12:00:00`));
      return { text: n <= 1 ? tr("متأخرة يوم") : n === 2 ? tr("متأخرة يومين") : n <= 10 ? tr("متأخرة {0} أيام", num(n)) : tr("متأخرة {0} يوم", num(n)), color: "#FF8A7A" };
    }
    if (kind === "today") return { text: tr("اليوم"), color: "#FFC777" };
    const d = daysUntil(t.dueDate, new Date(`${today}T12:00:00`));
    return { text: d === 1 ? tr("بكرة") : d <= 6 ? weekdayAr(new Date(`${t.dueDate}T00:00:00`)) : dayMonth(t.dueDate), color: "#ABA095" };
  };

  return (
    <section className={clsx("hg-card hg-glow flex flex-col !pb-4", className)} style={style} aria-labelledby="hg-todo-title">
      <div className="hg-hd">
        <span className="hg-hi" aria-hidden>
          <Check size={16} strokeWidth={1.8} />
        </span>
        <h2 id="hg-todo-title" className="m-0 text-[inherit] font-bold">
          {tr("وش علينا اليوم؟")}
        </h2>
        <Link to="/tasks" className="hg-go">
          {tr("الكل")}
        </Link>
      </div>
      {total > 0 && (
        <div className="hg-prog">
          <div className="hg-tr" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={tr("إنجاز اليوم")}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <span className="whitespace-nowrap text-[13px] text-[#ABA095]">
            {tr("{0} من {1} خلصت", "§0", "§1")
              .split(/(§0|§1)/)
              .map((part, i) =>
                part === "§0" ? (
                  <b key={i} className="hg-num text-[#EAE3DC]">
                    {done}
                  </b>
                ) : part === "§1" ? (
                  <b key={i} className="hg-num text-[#EAE3DC]">
                    {total}
                  </b>
                ) : (
                  part
                ),
              )}
          </span>
        </div>
      )}
      <ul className="relative z-[1] m-0 mt-2.5 list-none p-0">
        {items.length === 0 && <li className="px-3 py-4 text-[15px] text-[#ABA095]">{tr("ولا شي متأخر ولا شي موعده اليوم. يوم هادي ☕")}</li>}
        {items.map(({ task: t, kind }) => {
          const isDone = t.status === "done";
          const shownKind: TodoKind = isDone ? "done" : kind === "done" ? (isLate(t, today) ? "late" : t.dueDate === today ? "today" : "next") : kind;
          const due = dueLabel(t, shownKind);
          const idx = roster.findIndex((m) => m.id === t.assigneeId);
          const m = roster[idx];
          const tag = sectionTag(t);
          return (
            <li key={t.id} className={clsx("hg-td", shownKind === "late" && "late", isDone && "done", ticked.has(t.id) && "ticked")}>
              <button
                type="button"
                className="hg-cbtn"
                aria-pressed={isDone}
                aria-label={isDone ? tr("رجّع «{0}» مو مخلّصة", t.title) : tr("خلّصت «{0}»", t.title)}
                disabled={!canWrite}
                onClick={() => toggle(t, kind)}
              >
                <span className="hg-cb">
                  <Check size={14} strokeWidth={3} aria-hidden />
                </span>
              </button>
              <Link to={taskLink(t)} className="min-w-0 flex-1">
                <span className="hg-tt" dir="auto">
                  {t.title}
                </span>
                {tag && (
                  <span className="hg-tm hidden lg:flex">
                    <span className="hg-tag">{tag}</span>
                  </span>
                )}
              </Link>
              <span className="hg-due" style={{ color: due.color }}>
                {due.text}
              </span>
              {m && (
                <span className="hg-tav" title={m.name} style={{ background: `linear-gradient(160deg, ${PALETTE[idx % PALETTE.length].from}, ${PALETTE[idx % PALETTE.length].to})` }}>
                  {letter(m.name)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {canWrite && (
        <form className="hg-add relative z-[1] hidden lg:flex" onSubmit={submit}>
          <span className="hg-cb" aria-hidden>
            <span className="text-base leading-none">+</span>
          </span>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={tr("أضف مهمة لليوم…")} aria-label={tr("أضف مهمة لليوم")} disabled={adding} maxLength={200} />
          <span className="text-xs text-[#8F857C]" aria-hidden>
            Enter
          </span>
        </form>
      )}
    </section>
  );
}

// ───────────────────────────── تقدّم البحث (العدّاد البرتقالي) ─────────────────────────────

const G = { cx: 160, cy: 168 };
const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: +(G.cx + r * Math.cos(a)).toFixed(1), y: +(G.cy - r * Math.sin(a)).toFixed(1) };
};

function GaugeSvg({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, pct));
  // RTL: يتعبّى من اليمين لليسار. بالإنجليزي من اليسار لليمين
  const deg = isEn ? 180 - p * 1.8 : p * 1.8;
  const ticks = Array.from({ length: 61 }, (_, i) => {
    const d = i * 3;
    const long = i % 5 === 0;
    const a = polar(long ? 130 : 132, d);
    const b = polar(long ? 144 : 140, d);
    return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={long ? "rgba(255,245,235,.75)" : "rgba(255,245,235,.4)"} strokeWidth={long ? 2 : 1.2} />;
  });
  const n1 = polar(92, deg);
  const n2 = polar(150, deg);
  const pill = polar(172, deg);
  const px = Math.min(302, Math.max(18, pill.x));
  const py = Math.min(150, Math.max(11, pill.y));
  const arc = isEn ? "M48 168 A112 112 0 0 1 272 168" : "M272 168 A112 112 0 0 0 48 168";
  return (
    <svg viewBox="0 0 320 190" className="mt-1.5 block w-full" role="img" aria-label={tr("تقدّم البحث {0}٪", String(p))}>
      <defs>
        <linearGradient id="hg-gw" x1="1" x2="0">
          <stop offset="0" stopColor="#FFE7CF" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
        <radialGradient id="hg-gi" cx=".5" cy=".9" r=".9">
          <stop offset="0" stopColor="#FF5A00" />
          <stop offset=".7" stopColor="#FF7A1A" />
          <stop offset="1" stopColor="#FF9A45" />
        </radialGradient>
      </defs>
      {ticks}
      <path d={arc} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="36" />
      {p > 0 && <path className="hg-gfill" d={arc} fill="none" stroke="url(#hg-gw)" strokeWidth="36" pathLength={100} strokeDasharray={`${p} 100`} />}
      <path d="M74 168 A86 86 0 0 1 246 168 Z" fill="url(#hg-gi)" stroke="rgba(255,240,225,.6)" strokeWidth="1.5" />
      <line x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} stroke="#FFF7EE" strokeWidth="3" strokeLinecap="round" />
      <g transform={`translate(${px - 18},${py - 11})`}>
        <rect width="36" height="22" rx="11" fill="rgba(255,255,255,.28)" />
        <text x="18" y="15.5" textAnchor="middle" fontFamily="Tajawal" fontWeight="800" fontSize="12" fill="#2A0E02">
          {p}%
        </text>
      </g>
      <text x="160" y="156" textAnchor="middle" fontFamily="Tajawal" fontWeight="800" fontSize="52" fill="#FFF7EE">
        {p}
        <tspan fontSize="26">%</tspan>
      </text>
    </svg>
  );
}

export function ProgressCard({ pct, stagesDone, stagesTotal, note, style, className }: { pct: number; stagesDone: number; stagesTotal: number; note: string; style?: CSSProperties; className?: string }) {
  return (
    <Link to="/timeline" className={clsx("hg-card hg-orange flex flex-col", className)} style={style} aria-label={tr("تقدّم البحث {0}٪ — افتح الجدول الزمني", String(pct))}>
      <div className="hg-hd">
        <span className="hg-hi" aria-hidden>
          <Gauge size={16} strokeWidth={1.8} />
        </span>
        {tr("تقدّم البحث")}
        <span className="hg-go !min-h-0 text-lg" aria-hidden>
          {isEn ? "↗" : "↖"}
        </span>
      </div>
      <div className="mt-1.5 text-[12px] font-bold text-[#3A1504]">
        ● {tr("فريقكم")} · {tr("{0} من {1} مراحل خلصت", num(stagesDone), num(stagesTotal))}
      </div>
      <div className="mx-1.5 my-auto lg:mx-0">
        <GaugeSvg pct={pct} />
      </div>
      <div className="-mt-0.5 text-center text-[13px] font-bold text-[#2A0E02] lg:text-sm">{note}</div>
    </Link>
  );
}

// ───────────────────────────── باقي على التسليم ─────────────────────────────

export type AreaBar = { key: string; label: string; icon: "proposal" | "lit" | "method" | "ethics"; done: number; total: number; late: number; to: string };

const AREA_ICON = { proposal: PenLine, lit: BookOpen, method: Route, ethics: Shield } as const;

export function DeadlineCard({
  deadline,
  daysLeft,
  bars,
  canWrite,
  onSetDeadline,
  style,
  className,
}: {
  deadline: string | null;
  daysLeft: number | null;
  bars: AreaBar[];
  canWrite: boolean;
  onSetDeadline: () => void;
  style?: CSSProperties;
  className?: string;
}) {
  const d = deadline ? new Date(`${deadline}T00:00:00`) : null;
  return (
    <section className={clsx("hg-card flex-col", className ?? "flex")} style={style} aria-labelledby="hg-dl-title">
      <div className="hg-hd">
        <span className="hg-hi" aria-hidden>
          <Clock size={16} strokeWidth={1.8} />
        </span>
        <h2 id="hg-dl-title" className="m-0 text-[inherit] font-bold">
          {(daysLeft ?? 0) < 0 ? tr("فات موعد التسليم") : tr("باقي على التسليم")}
        </h2>
        {deadline && canWrite && (
          <button type="button" className="hg-go" onClick={onSetDeadline}>
            {tr("عدّل")}
          </button>
        )}
      </div>
      {deadline && d ? (
        <div className="mt-2.5 flex items-baseline gap-2.5">
          <span className="hg-num hg-days text-[72px] leading-[.95] text-[#F2EBE3]">{Math.abs(daysLeft ?? 0)}</span>
          <span className="text-[22px] font-extrabold">{daysWord(Math.abs(daysLeft ?? 0))}</span>
          <span className="ms-auto text-end text-sm text-[#ABA095]">
            {isEn ? d.toLocaleDateString("en", { weekday: "long" }) : weekdayAr(d)}
            <br />
            <b className="text-[#FF9A3C]">{dayMonth(deadline)}</b>
          </span>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-[rgba(255,140,40,.14)] text-[#FF9A3C]" aria-hidden>
              <Flag size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-extrabold">{tr("حدّدوا موعد التسليم")}</div>
              <div className="text-[13px] text-[#ABA095]">{tr("ونحسب لكم كم يوم باقي")}</div>
            </div>
          </div>
          {canWrite && (
            <button type="button" className="v3-bd w-full justify-center !min-h-[44px] !text-sm" onClick={onSetDeadline}>
              {tr("اختاروا التاريخ")}
            </button>
          )}
        </div>
      )}
      <div className="mt-auto pt-2">
        {bars.map((b, i) => {
          const Icon = AREA_ICON[b.icon];
          const donePct = b.total ? (b.done / b.total) * 100 : 0;
          const latePct = b.total ? (b.late / b.total) * 100 : 0;
          return (
            <Link key={b.key} to={b.to} className="mt-[13px] flex items-center gap-3" aria-label={tr("{0}: {1} من {2}", b.label, num(b.done), num(b.total))}>
              <span className="flex w-24 items-center gap-2 text-sm text-[#D9D0C6]">
                <Icon size={15} strokeWidth={1.7} aria-hidden />
                {b.label}
              </span>
              <span className="hg-bar" aria-hidden>
                {latePct > 0 && <i style={{ width: `${Math.max(4, latePct)}%`, background: "#FF5A4A", animationDelay: `${0.4 + i * 0.06}s` }} />}
                {donePct > 0 && <i style={{ width: `${donePct}%`, background: "linear-gradient(90deg,#FF7A1A,#FFB444)", animationDelay: `${0.52 + i * 0.06}s` }} />}
              </span>
              <span className="hg-num w-10 text-sm text-[#EAE3DC]" aria-hidden>
                {b.total ? `${b.done}/${b.total}` : "—"}
              </span>
            </Link>
          );
        })}
        {bars.length > 0 && (
          <div className="mt-4 flex gap-3.5 text-xs text-[#ABA095]">
            <span>
              <i className="inline-block h-2 w-2 rounded-full bg-[#FF5A4A]" aria-hidden /> {tr("متأخر")}
            </span>
            <span>
              <i className="inline-block h-2 w-2 rounded-full bg-[#FF9A3C]" aria-hidden /> {tr("خلص")}
            </span>
            <span>
              <i className="inline-block h-2 w-2 rounded-full bg-white/20" aria-hidden /> {tr("باقي")}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

/** بلاطتين الجوال: باقي على التسليم + هالأسبوع */
export function MobileTiles({
  deadline,
  daysLeft,
  weekDone,
  weekDiff,
  canWrite,
  onSetDeadline,
  style,
}: {
  deadline: string | null;
  daysLeft: number | null;
  weekDone: number;
  weekDiff: number;
  canWrite: boolean;
  onSetDeadline: () => void;
  style?: CSSProperties;
}) {
  const d = deadline ? new Date(`${deadline}T00:00:00`) : null;
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:hidden" style={style}>
      <div className="hg-card" style={rise(2)}>
        <div className="text-xs font-bold text-[#ABA095]">{(daysLeft ?? 0) < 0 ? tr("فات موعد التسليم") : tr("باقي على التسليم")}</div>
        {deadline && d ? (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="hg-num hg-days text-[46px] leading-[1.05] text-[#F2EBE3]">{Math.abs(daysLeft ?? 0)}</span>
              <b className="text-base">{daysWord(Math.abs(daysLeft ?? 0))}</b>
            </div>
            <div className="text-xs text-[#FF9A3C]">{isEn ? formatDateShort(deadline) : `${weekdayAr(d)} ${dayMonth(deadline)}`}</div>
          </>
        ) : canWrite ? (
          <button type="button" className="mt-2 min-h-[44px] text-start text-[15px] font-extrabold text-[#FF9A3C]" onClick={onSetDeadline}>
            {tr("حدّدوا الموعد ←")}
          </button>
        ) : (
          <div className="mt-2 text-sm text-[#ABA095]">{tr("ما انحدد بعد")}</div>
        )}
      </div>
      <Link to="/tasks" className="hg-card block" style={rise(3)}>
        <div className="text-xs font-bold text-[#ABA095]">{tr("هالأسبوع")}</div>
        <div className="flex items-baseline gap-1.5">
          <span className="hg-num text-[46px] leading-[1.05] text-[#F2EBE3]">{weekDone}</span>
          <b className="text-base">{weekDone === 1 ? tr("مهمة") : weekDone === 2 ? tr("مهمتين") : weekDone <= 10 ? tr("مهام") : tr("مهمة")}</b>
        </div>
        <div className="text-xs" style={{ color: weekDiff > 0 ? "#7FE0A6" : "#ABA095" }}>
          {weekDiff > 0 ? tr("+{0} عن اللي قبله", num(weekDiff)) : weekDiff < 0 ? tr("{0} أقل من اللي قبله", num(-weekDiff)) : tr("نفس الأسبوع اللي قبله")}
        </div>
      </Link>
    </div>
  );
}

// ───────────────────────────── رحلة البحث ─────────────────────────────

export type JourneyStep = { key: string; label: string; state: "done" | "now" | "todo" | "deliver"; long: string; short: string; to: string };

const STATE_COLOR = { done: "#7FE0A6", now: "#FFC777", todo: "#ABA095", deliver: "#FF9A3C" } as const;
const XS = [750, 570, 390, 210, 30];

export function JourneyCard({ steps, headerNote, style, className }: { steps: JourneyStep[]; headerNote: string; style?: CSSProperties; className?: string }) {
  const curIdx = Math.max(0, steps.findIndex((s) => s.state === "now" || s.state === "deliver"));
  // التوهّج قوي لين المرحلة الحالية وبعدها يخفت
  const curOff = Math.min(0.95, Math.max(0.05, (760 - XS[curIdx]) / 760));
  const xs = isEn ? XS.map((x) => 760 - x) : XS;
  const band = (h: number[]) => {
    const [a, b, c, d, e] = h;
    const top = isEn ? `M0 ${60 + a} L10 ${60 + a} L190 ${60 + b} L370 ${60 + c} L550 ${60 + d} L730 ${60 + e} L760 ${60 + e}` : `M760 ${60 + a} L750 ${60 + a} L570 ${60 + b} L390 ${60 + c} L210 ${60 + d} L30 ${60 + e} L0 ${60 + e}`;
    const bot = isEn
      ? `L760 ${180 - e} L730 ${180 - e} L550 ${180 - d} L370 ${180 - c} L190 ${180 - b} L10 ${180 - a} L0 ${180 - a} Z`
      : `L0 ${180 - e} L30 ${180 - e} L210 ${180 - d} L390 ${180 - c} L570 ${180 - b} L750 ${180 - a} L760 ${180 - a} Z`;
    return `${top} ${bot}`;
  };
  return (
    <section className={clsx("hg-card", className)} style={style} aria-labelledby="hg-journey-title">
      <div className="hg-hd">
        <span className="hg-hi" aria-hidden>
          <Route size={16} strokeWidth={1.8} />
        </span>
        <h2 id="hg-journey-title" className="m-0 text-[inherit] font-bold">
          {tr("رحلة البحث")}
        </h2>
        <span className="text-[13px] font-medium text-[#ABA095] lg:ms-2">
          <span className="hidden lg:inline">{tr("من الموضوع للتسليم")}</span>
        </span>
        <span className="ms-auto text-xs font-medium text-[#ABA095] lg:hidden">{headerNote}</span>
      </div>

      {/* كمبيوتر: شريط متوهّج والمراحل فوقه */}
      <div className="relative mt-3 hidden h-[190px] lg:block">
        <svg className="hg-band absolute inset-0 h-full w-full" viewBox="0 0 760 190" preserveAspectRatio="none" aria-hidden>
          <defs>
            <filter id="hg-bl8" x="-10%" y="-50%" width="120%" height="200%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
            <filter id="hg-bl2">
              <feGaussianBlur stdDeviation="2" />
            </filter>
            <linearGradient id="hg-fb" x1={isEn ? 0 : 1} x2={isEn ? 1 : 0}>
              <stop offset="0" stopColor="#FFB15C" />
              <stop offset={curOff * 0.6} stopColor="#FF7A1A" />
              <stop offset={curOff} stopColor="#C2400A" stopOpacity=".55" />
              <stop offset="1" stopColor="#5A1A05" stopOpacity=".2" />
            </linearGradient>
          </defs>
          {xs.map((x, i) => (
            <g key={i}>
              <line x1={x} y1="18" x2={x} y2="190" stroke="rgba(255,255,255,.14)" strokeDasharray="3 4" />
              <circle cx={x} cy="18" r="3.5" fill={i <= curIdx ? "#FF9A3C" : "#6E645C"} />
            </g>
          ))}
          <path d={band([5, 12, 28, 38, 45])} fill="#FF6A00" opacity=".25" filter="url(#hg-bl8)" />
          <path d={band([23, 29, 40, 46, 50])} fill="url(#hg-fb)" opacity=".55" filter="url(#hg-bl2)" />
          <path d={band([42, 45, 51, 54, 56])} fill="url(#hg-fb)" />
        </svg>
        {steps.map((s, i) =>
          s.state === "deliver" && i === steps.length - 1 ? (
            <div key={s.key} className="hg-stage" style={{ top: "auto", bottom: 4, [isEn ? "right" : "left"]: 0 }}>
              <b>{s.label}</b>
              <span style={{ color: STATE_COLOR.deliver }}>{s.long}</span>
            </div>
          ) : (
            <Link key={s.key} to={s.to} className="hg-stage" style={{ [isEn ? "left" : "right"]: `calc(${(((760 - XS[i]) / 760) * 100).toFixed(1)}% + 8px)` }} aria-current={s.state === "now" ? "step" : undefined}>
              <b>{s.label}</b>
              <span style={{ color: STATE_COLOR[s.state] }}>{s.long}</span>
            </Link>
          ),
        )}
      </div>

      {/* جوال: نقاط وتحت كل نقطة الحالة مختصرة */}
      <div className="lg:hidden">
        <div className="relative mt-2.5 h-[74px]">
          <svg className="hg-band absolute inset-0 h-full w-full" viewBox="0 0 340 74" preserveAspectRatio="none" aria-hidden>
            <defs>
              <filter id="hg-m6" x="-10%" y="-60%" width="120%" height="220%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
              <filter id="hg-m1">
                <feGaussianBlur stdDeviation="1.2" />
              </filter>
              <linearGradient id="hg-mfb" x1={isEn ? 0 : 1} x2={isEn ? 1 : 0}>
                <stop offset="0" stopColor="#FFB15C" />
                <stop offset={curOff * 0.6} stopColor="#FF7A1A" />
                <stop offset={curOff} stopColor="#C2400A" stopOpacity=".5" />
                <stop offset="1" stopColor="#5A1A05" stopOpacity=".2" />
              </linearGradient>
            </defs>
            <path d={isEn ? "M0 7 L6 7 L88 12 L170 20 L252 26 L334 30 L340 30 L340 44 L334 44 L252 48 L170 54 L88 62 L6 67 L0 67 Z" : "M340 7 L334 7 L252 12 L170 20 L88 26 L6 30 L0 30 L0 44 L6 44 L88 48 L170 54 L252 62 L334 67 L340 67 Z"} fill="#FF6A00" opacity=".25" filter="url(#hg-m6)" />
            <path d={isEn ? "M0 18 L6 18 L88 21 L170 27 L252 30 L334 32 L340 32 L340 42 L334 42 L252 44 L170 47 L88 53 L6 56 L0 56 Z" : "M340 18 L334 18 L252 21 L170 27 L88 30 L6 32 L0 32 L0 42 L6 42 L88 44 L170 47 L252 53 L334 56 L340 56 Z"} fill="url(#hg-mfb)" opacity=".55" filter="url(#hg-m1)" />
            <path d={isEn ? "M0 28 L6 28 L88 30 L170 32.5 L252 34 L334 35 L340 35 L340 39 L334 39 L252 40 L170 41.5 L88 44 L6 46 L0 46 Z" : "M340 28 L334 28 L252 30 L170 32.5 L88 34 L6 35 L0 35 L0 39 L6 39 L88 40 L170 41.5 L252 44 L334 46 L340 46 Z"} fill="url(#hg-mfb)" />
            {[334, 252, 170, 88, 6].map((x0, i) => {
              const x = isEn ? 340 - x0 : x0;
              const s = steps[i];
              const cur = s && (s.state === "now" || (s.state === "deliver" && i === curIdx));
              return <circle key={i} cx={x} cy="37" r={cur ? 5 : 3.5} fill={s && (s.state === "done" || cur) ? "#FFF3E8" : "#6E645C"} stroke={cur ? "#FF9A3C" : "none"} strokeWidth="3" />;
            })}
          </svg>
        </div>
        <ol className="m-0 mt-1.5 flex list-none justify-between p-0">
          {steps.map((s) => (
            <li key={s.key} className="w-[62px] text-center" aria-current={s.state === "now" ? "step" : undefined}>
              <div className="text-sm font-extrabold" style={{ color: s.state === "done" ? "#7FE0A6" : s.state === "deliver" ? "#FF9A3C" : s.state === "now" ? "#F2EBE3" : "#ABA095" }}>
                {s.short}
              </div>
              <div className="text-xs" style={{ color: s.state === "now" ? "#FF9A3C" : "#ABA095", fontWeight: s.state === "now" ? 800 : 500 }}>
                {s.label}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ───────────────────────────── إنجاز الفريق ─────────────────────────────

export function TeamChartCard({ tasks, today, style, className }: { tasks: Task[]; today: string; style?: CSSProperties; className?: string }) {
  const allWeeks = useMemo(() => {
    const first = tasks.reduce((min, t) => {
      const d = (t.completedAt ?? t.dueDate ?? "").slice(0, 10);
      return d && d < min ? d : min;
    }, today);
    return Math.min(26, Math.max(2, Math.ceil((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / (7 * 86400000)) + 1));
  }, [tasks, today]);
  const [range, setRange] = useState<"month" | "8w" | "all">("8w");
  const weeks = range === "month" ? 4 : range === "8w" ? 8 : allWeeks;
  const series = useMemo(() => weeklySeries(tasks, today, weeks), [tasks, today, weeks]);
  const max = Math.max(4, ...series.map((s) => Math.max(s.done, s.planned)));
  const top = Math.ceil(max / 2) * 2;
  const W = 420;
  const x = (i: number) => {
    const step = weeks > 1 ? 380 / (weeks - 1) : 0;
    return isEn ? 20 + i * step : 400 - i * step;
  };
  const y = (v: number) => 150 - (v / top) * 112;
  const donePts = series.map((s, i) => `${x(i).toFixed(1)},${y(s.done).toFixed(1)}`).join(" ");
  const planPts = series.map((s, i) => `${x(i).toFixed(1)},${y(s.planned).toFixed(1)}`).join(" ");
  const last = series[series.length - 1];
  const labelEvery = Math.ceil(weeks / 8);
  return (
    <section className={clsx("hg-card", className)} style={style} aria-labelledby="hg-chart-title">
      <div className="hg-hd">
        <span className="hg-hi" aria-hidden>
          <Users size={16} strokeWidth={1.8} />
        </span>
        <h2 id="hg-chart-title" className="m-0 text-[inherit] font-bold">
          {tr("إنجاز الفريق")}
        </h2>
        <div className="hg-seg" role="group" aria-label={tr("المدة")}>
          {(
            [
              ["month", tr("شهر")],
              ["8w", tr("٨ أسابيع")],
              ["all", tr("الكل")],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={range === k} onClick={() => setRange(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} 174`} className="mt-2.5 block w-full" role="img" aria-label={tr("مهام خلصت بآخر {0} أسابيع، هالأسبوع {1}", num(weeks), num(last?.done ?? 0))}>
        <defs>
          <linearGradient id="hg-ar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FF7A1A" stopOpacity=".55" />
            <stop offset="1" stopColor="#FF7A1A" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, top / 2, top].map((v) => (
          <g key={v}>
            <line x1="0" x2={W} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,.06)" />
            <text x={isEn ? 0 : W} y={y(v) - 4} textAnchor={isEn ? "start" : "end"} fontSize="10" fill="#8F857C" fontFamily="Tajawal">
              {v}
            </text>
          </g>
        ))}
        <polygon points={`${x(0).toFixed(1)},150 ${donePts} ${x(weeks - 1).toFixed(1)},150`} fill="url(#hg-ar)" />
        <polyline points={planPts} fill="none" stroke="#E9C9A0" strokeWidth="1.5" strokeDasharray="4 5" opacity=".7" />
        <polyline key={weeks} className="hg-draw" points={donePts} fill="none" stroke="#FF9A3C" strokeWidth="2.5" strokeLinejoin="round" pathLength={1} />
        {last && <circle cx={x(weeks - 1)} cy={y(last.done)} r="9" fill="#FF7A1A" stroke="#FFE7CF" strokeWidth="2.5" />}
        {series.map((_, i) =>
          i % labelEvery === 0 || i === weeks - 1 ? (
            <text key={i} x={x(i)} y="170" textAnchor="middle" fontSize="10" fill="#8F857C" fontFamily="Tajawal">
              {i + 1}
            </text>
          ) : null,
        )}
      </svg>
      <div className="mt-1.5 flex flex-wrap gap-3.5 text-xs text-[#ABA095]">
        <span className="text-[#FF9A3C]">● {tr("مهام خلصت")}</span>
        <span>┄ {tr("المخطط")}</span>
        <span>{tr("الأسابيع ←")}</span>
        <span className="ms-auto text-[#EAE3DC]">
          {tr("هالأسبوع")} <b className="hg-num">{last?.done ?? 0}</b> {(last?.done ?? 0) === 1 ? tr("مهمة") : (last?.done ?? 0) === 2 ? tr("مهمتين") : (last?.done ?? 0) <= 10 ? tr("مهام") : tr("مهمة")}
        </span>
      </div>
    </section>
  );
}

// ───────────────────────────── وكيل Wesync ─────────────────────────────

export function AgentScene({ cards, style }: { cards: { title: string; sub: string }[]; style?: CSSProperties }) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const send = (e?: FormEvent) => {
    e?.preventDefault();
    openAgent(q.trim() || undefined);
    setQ("");
  };
  const desk = [
    { r: "4%", top: 34, rot: "-8deg" },
    { r: "19%", top: 6, rot: "6deg" },
    { r: "34%", top: 40, rot: "-4deg" },
    { r: "49%", top: 10, rot: "9deg" },
  ];
  const mob = [
    { r: "2%", top: 92, rot: "-8deg" },
    { r: "34%", top: 80, rot: "5deg" },
    { r: "66%", top: 96, rot: "-5deg" },
  ];
  const suggestions = [tr("اكتب مسودة الهدف"), tr("راجع المنهجية"), tr("جهّز أجندة الاجتماع")];
  const side = isEn ? "left" : "right";
  return (
    <section className="hg-ai mb-5" style={style} aria-labelledby="hg-ai-title">
      {/* البطاقات الطايرة: كمبيوتر ٤، جوال ٣ */}
      {cards.slice(0, 4).map((c, i) => (
        <div key={`d${i}`} className="hg-fc hidden lg:block" aria-hidden style={{ [side]: desk[i].r, top: desk[i].top, ["--r" as string]: desk[i].rot, animationDelay: `${0.5 + i * 0.12}s` }}>
          <b>{c.title}</b>
          <span>{c.sub}</span>
          <div className="hg-fold" />
        </div>
      ))}
      {cards.slice(0, 3).map((c, i) => (
        <div key={`m${i}`} className="hg-fc lg:hidden" aria-hidden style={{ [side]: mob[i].r, top: mob[i].top, ["--r" as string]: mob[i].rot, animationDelay: `${0.5 + i * 0.12}s` }}>
          <b>{c.title}</b>
          <span>{c.sub}</span>
          <div className="hg-fold" />
        </div>
      ))}
      <div className={clsx("relative z-[2] lg:absolute lg:top-10 lg:w-[330px]", isEn ? "lg:right-[34px]" : "lg:left-[34px]")}>
        <div className="text-xs font-extrabold tracking-[.12em] text-[rgba(255,235,220,.75)] lg:text-[13px]">{tr("وكيل Wesync")}</div>
        <h2 id="hg-ai-title" className="m-0 mt-1 text-[22px] font-extrabold leading-[1.3] text-[#FFF3E8] lg:mt-1.5 lg:text-[34px] lg:leading-[1.25]">
          <span className="lg:hidden">{tr("اسألوه، يعرف بحثكم كامل")}</span>
          <span className="hidden lg:inline">
            {tr("اسألوه عن بحثكم،")}
            <br />
            {tr("هو يعرفه كامل")}
          </span>
        </h2>
        <p className="m-0 mt-2 hidden text-[15px] leading-[1.8] text-[rgba(255,235,220,.75)] lg:block">{tr("الأقسام، الملفات، الدراسات، وملاحظات المشرف/ة. اكتبوا سؤالكم وهو يجاوب.")}</p>
      </div>
      <form className="hg-prompt" onSubmit={send}>
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("لخّص لي آخر ٣ دراسات عن موضوعنا، وطلّع الفجوة البحثية")} aria-label={tr("اسأل وكيل Wesync")} />
        <div className="-mx-4 mt-2.5 flex gap-1.5 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:mt-3 lg:flex-wrap lg:gap-2 lg:overflow-visible lg:px-0">
          {suggestions.map((s) => (
            <button key={s} type="button" className="hg-sug" onClick={() => openAgent(s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center lg:mt-[18px]">
          <button type="button" className="hg-pbtn" onClick={() => openAgent()} aria-label={tr("افتح وكيل Wesync")}>
            <AgentWave size={22} />
          </button>
          <div className="flex flex-1 flex-col items-center gap-1.5 lg:gap-2" aria-hidden>
            <div className="hg-wv">
              {[
                [70, 40, 26],
                [90, 50, 20, 34],
                [24, 30, 44, 60],
              ].map((row, r) => (
                <div key={r}>
                  {row.map((w, i) => (
                    <i key={i} style={{ width: w * 0.75, animationDelay: `${0.9 + i * 0.05}s` }} />
                  ))}
                </div>
              ))}
            </div>
            <span className="text-[13px] text-[rgba(255,235,220,.7)] lg:text-[15px]">{tr("اكتبوا واضغطوا Enter")}</span>
          </div>
          <button type="submit" className="hg-pbtn" aria-label={tr("أرسل للوكيل")}>
            <ArrowUp size={22} aria-hidden />
          </button>
        </div>
      </form>
    </section>
  );
}
