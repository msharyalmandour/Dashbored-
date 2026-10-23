import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bot, Check, ChevronLeft, ChevronRight, ChevronsLeft, Circle, Flame, PenLine, Target, Undo2, X } from "lucide-react";
import Card from "./ui/Card";
import Reveal from "./Reveal";
import { STAGE_ACTION, type NextStep } from "../lib/nextSteps";
import { isStageReady, nextStageOf, previousStageOf } from "../lib/stageAdvance";
import { toISODate } from "../lib/date";
import { g } from "../lib/gender";
import type { ResearchStageRow } from "../data/types";

type StageUpdate = Partial<Pick<ResearchStageRow, "status" | "progress" | "startDate" | "completedDate">>;
type Result = { error?: string };

const DISMISS_KEY = "wesync.gettingStarted.dismissed";
const CONFETTI = [
  [-70, -60], [-40, -90], [0, -100], [40, -90], [70, -60], [-90, -20], [90, -20], [-55, -30], [55, -30], [0, -55],
] as const;

interface Slide {
  id: string;
  kind: "title" | "advance" | "step" | "calm";
  step?: NextStep;
}

interface TodayCardProps {
  stages: ResearchStageRow[];
  autoData: Parameters<typeof isStageReady>[1];
  projectTitle: string;
  isLeader: boolean;
  isFemale: boolean;
  updateStage: (id: string, updates: StageUpdate) => Promise<Result>;
  saveTitle: (title: string) => Promise<Result>;
  nextSteps: NextStep[];
  /** null = لا نعرض شريط البدايات (مثلاً بالوضع التجريبي) */
  onboarding: { hasTitle: boolean; hasSupervisor: boolean; hasMyTask: boolean } | null;
}

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** بطاقة «اليوم» — بدل أربع بطاقات متكدّسة فوق الهيرو: بطاقة وحدة، خطوة وحدة بزر واحد،
    وباقي الخطوات شرائح تتبدّل بانزلاق. تجمع: تثبيت العنوان، الانتقال للمرحلة الجاية، الخطوات التالية، والبدايات. */
export default function TodayCard({ stages, autoData, projectTitle, isLeader, isFemale, updateStage, saveTitle, nextSteps, onboarding }: TodayCardProps) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [onbDismissed, setOnbDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const current = [...stages].sort((a, b) => a.order - b.order).find((s) => s.status !== "done");
  const next = current ? nextStageOf(stages, current) : undefined;
  const prev = current ? previousStageOf(stages, current) : undefined;
  const ready = !!current && isStageReady(current, autoData, projectTitle);
  const nextAction = next ? STAGE_ACTION[next.stageKey] : undefined;

  const slides: Slide[] = [];
  if (current?.stageKey === "topic" && !ready) slides.push({ id: "title", kind: "title" });
  else if (ready && next && nextAction) slides.push({ id: "advance", kind: "advance" });
  // خطوة «ثبّتوا العنوان» العامة تغطيها شريحة العنوان نفسها
  for (const s of nextSteps) if (s.id !== "stage-topic") slides.push({ id: `step-${s.id}`, kind: "step", step: s });
  if (slides.length === 0) slides.push({ id: "calm", kind: "calm" });
  const at = Math.min(index, slides.length - 1);
  const slide = slides[at];

  const go = (to: number) => {
    setDir(to > at ? 1 : -1);
    setIndex(Math.max(0, Math.min(slides.length - 1, to)));
  };

  const celebrateFor = (text: string) => {
    setCelebrate(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCelebrate(null), reducedMotion() ? 900 : 1900);
  };

  const run = async (fn: () => Promise<Result>, onOk?: () => void) => {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res.error) setError("ما قدرنا نحفظ التغيير — جرّبوا مرة ثانية، أو تأكدوا إن فريقكم مشترك.");
    else onOk?.();
  };

  const advance = () => {
    if (!current) return;
    run(
      async () => {
        const today = toISODate(new Date());
        const first = await updateStage(current.id, { status: "done", progress: 100, completedDate: today });
        if (first.error || !next) return first;
        return updateStage(next.id, { status: "active", startDate: next.startDate ?? today });
      },
      () => {
        setIndex(0);
        celebrateFor(next ? `انتقلتم إلى «${next.titleAr}»` : "خلصتوا المرحلة");
      },
    );
  };

  const revert = () => {
    if (!current || !prev) return;
    run(async () => {
      const first = await updateStage(current.id, { status: "upcoming", progress: 0 });
      if (first.error) return first;
      return updateStage(prev.id, { status: "active", completedDate: null });
    });
  };

  const urgent = slide.kind === "step" && slide.step?.tone === "urgent";
  const Icon = slide.kind === "title" ? PenLine : slide.kind === "advance" ? Check : urgent ? Flame : slide.kind === "calm" ? Bot : Target;
  const iconBg = slide.kind === "title" ? "bg-amber-accent-500" : urgent ? "bg-rose-500" : "bg-brand-500";

  const onb = onboarding && !onbDismissed ? onboarding : null;
  const onbSteps = onb
    ? [
        { id: "t", label: "العنوان", done: onb.hasTitle, to: "/" },
        { id: "s", label: "المشرفة", done: onb.hasSupervisor, to: "/team" },
        { id: "k", label: "أول مهمة", done: onb.hasMyTask, to: "/tasks" },
      ]
    : [];
  const showOnb = onb && onbSteps.some((s) => !s.done);

  return (
    <Reveal delay={450}>
      <Card tone={urgent ? "rose" : slide.kind === "title" ? "amber" : "teal"} className="relative space-y-3 overflow-hidden">
        {celebrate ? (
          <div className="relative flex items-center gap-4 py-2" role="status">
            <span className="today-check flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" className="today-check-path" />
              </svg>
            </span>
            <p className="text-base font-extrabold text-brand-950">{celebrate}</p>
            {!reducedMotion() && (
              <span className="pointer-events-none absolute start-6 top-1/2" aria-hidden="true">
                {CONFETTI.map(([dx, dy], i) => (
                  <span
                    key={i}
                    className="absolute h-1.5 w-1.5 rounded-full bg-amber-accent-500"
                    style={{ ["--dx" as string]: `${dx}px`, ["--dy" as string]: `${dy}px`, animation: `confetti-pop 900ms ${i * 25}ms ease-out forwards` }}
                  />
                ))}
              </span>
            )}
          </div>
        ) : (
          <div key={slide.id} className="today-slide" style={{ ["--today-dx" as string]: `${dir * -28}px` }}>
            <div className="flex flex-wrap items-center gap-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white ${iconBg}`}>
                <Icon size={22} />
              </span>
              <div className="min-w-0 flex-1">
                {slide.kind === "title" && (
                  <>
                    <p className="text-[11px] font-bold text-brand-950/45">الخطوة الأولى</p>
                    <p className="text-base font-extrabold text-brand-950">ثبّتوا عنوان بحثكم</p>
                  </>
                )}
                {slide.kind === "advance" && current && next && nextAction && (
                  <>
                    <p className="text-[11px] font-bold text-brand-950/45">خلصتوا «{current.titleAr}»</p>
                    <p className="text-base font-extrabold text-brand-950">المرحلة الجاية: {next.titleAr}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-brand-950/60">{nextAction.title} — {nextAction.why}</p>
                  </>
                )}
                {slide.kind === "step" && slide.step && (
                  <>
                    <p className="text-[11px] font-bold text-brand-950/45">وش {g(isFemale, "تسوين", "تسوي")} الحين؟</p>
                    <p className="text-base font-extrabold text-brand-950">{slide.step.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-brand-950/60">{slide.step.why}</p>
                  </>
                )}
                {slide.kind === "calm" && (
                  <>
                    <p className="text-base font-extrabold text-brand-950">كل شي ماشي 👌</p>
                    <p className="text-xs text-brand-950/55">ما فيه شي عاجل الحين. {g(isFemale, "اسألي", "اسأل")} الكوتش عن أفضل استغلال لوقتكم.</p>
                  </>
                )}
              </div>
              {slide.kind === "advance" && (
                <button onClick={advance} disabled={busy} className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50">
                  انقلونا للجاية
                  <ChevronsLeft size={16} />
                </button>
              )}
              {slide.kind === "step" && slide.step && (
                <Link to={slide.step.to} className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600">
                  {slide.step.cta}
                  <ArrowLeft size={15} />
                </Link>
              )}
            </div>
            {slide.kind === "title" &&
              (isLeader ? (
                <form
                  className="mt-3 flex flex-wrap gap-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const title = draft.trim();
                    if (title) run(() => saveTitle(title), () => celebrateFor("تثبّت عنوان البحث"));
                  }}
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="مثال: أثر برنامج تدريبي على معرفة الممرضين بمكافحة العدوى"
                    className="min-w-0 flex-1 rounded-xl border border-brand-100 bg-paper px-3.5 py-2.5 text-sm outline-none focus:border-brand-300"
                  />
                  <button disabled={busy || !draft.trim()} className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50">
                    تثبيت العنوان
                  </button>
                </form>
              ) : (
                <p className="mt-2 text-sm text-brand-950/65">قائد الفريق هو اللي يثبّت العنوان. {g(isFemale, "نبّهيه", "نبّهه")} إذا اتفقتم على الموضوع.</p>
              ))}
          </div>
        )}

        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

        {!celebrate && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-brand-100/60 pt-2.5">
            {slides.length > 1 && (
              <div className="flex items-center gap-1.5">
                <button aria-label="السابق" onClick={() => go(at - 1)} disabled={at === 0} className="rounded-full p-1 text-brand-950/50 hover:bg-surface-muted disabled:opacity-30">
                  <ChevronRight size={14} />
                </button>
                {slides.map((s, i) => (
                  <button key={s.id} aria-label={`الخطوة ${i + 1}`} onClick={() => go(i)} className={`h-1.5 rounded-full transition-all ${i === at ? "w-5 bg-brand-500" : "w-1.5 bg-brand-950/20"}`} />
                ))}
                <button aria-label="التالي" onClick={() => go(at + 1)} disabled={at === slides.length - 1} className="rounded-full p-1 text-brand-950/50 hover:bg-surface-muted disabled:opacity-30">
                  <ChevronLeft size={14} />
                </button>
              </div>
            )}
            {current && (
              <p className="min-w-0 flex-1 truncate text-[11px] text-brand-950/50">
                مرحلتكم: <b className="text-brand-950/75">{current.titleAr}</b>
                {next && <> · الجاية: {next.titleAr}</>}
              </p>
            )}
            {current && next && !ready && (
              <button
                onClick={() => {
                  if (window.confirm(`تأكدتم إنكم خلصتوا «${current.titleAr}» وتبون تنتقلون لـ «${next.titleAr}»؟`)) advance();
                }}
                disabled={busy}
                className="rounded-lg border border-brand-100 px-2.5 py-1 text-[11px] font-bold text-brand-700 hover:bg-surface-muted disabled:opacity-50"
              >
                خلّصنا هالمرحلة
              </button>
            )}
            {prev && (
              <button onClick={revert} disabled={busy} className="flex items-center gap-1 text-[11px] font-bold text-brand-950/40 hover:text-brand-950/70">
                <Undo2 size={11} />
                رجّعوا «{prev.titleAr}»
              </button>
            )}
          </div>
        )}

        {showOnb && !celebrate && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-paper/60 px-3 py-2">
            <span className="text-[11px] font-extrabold text-brand-950/55">ابدأوا بثلاث خطوات</span>
            {onbSteps.map((s) => (
              <Link key={s.id} to={s.to} className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${s.done ? "border-brand-200 text-brand-950/40 line-through" : "border-brand-100 text-brand-700 hover:bg-surface-muted"}`}>
                {s.done ? <Check size={11} className="text-brand-500" /> : <Circle size={11} className="text-brand-950/30" />}
                {s.label}
              </Link>
            ))}
            <button
              aria-label="إخفاء"
              onClick={() => {
                try {
                  localStorage.setItem(DISMISS_KEY, "1");
                } catch {
                  // ما يهم
                }
                setOnbDismissed(true);
              }}
              className="ms-auto rounded-md p-0.5 text-brand-950/35 hover:bg-surface-muted"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </Card>
    </Reveal>
  );
}
