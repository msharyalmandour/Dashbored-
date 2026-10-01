import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ChevronsLeft, PenLine, Undo2 } from "lucide-react";
import Card from "./ui/Card";
import { STAGE_ACTION } from "../lib/nextSteps";
import { isStageReady, nextStageOf, previousStageOf } from "../lib/stageAdvance";
import { toISODate } from "../lib/date";
import { g } from "../lib/gender";
import type { ResearchStageRow } from "../data/types";

type StageUpdate = Partial<Pick<ResearchStageRow, "status" | "progress" | "startDate" | "completedDate">>;

interface StageAdvanceCardProps {
  stages: ResearchStageRow[];
  autoData: Parameters<typeof isStageReady>[1];
  projectTitle: string;
  isLeader: boolean;
  isFemale: boolean;
  updateStage: (id: string, updates: StageUpdate) => Promise<{ error?: string }>;
  saveTitle: (title: string) => Promise<{ error?: string }>;
}

/** «وين نروح بعد؟» — يثبّت عنوان البحث، يقول متى خلصت المرحلة، وينقل الفريق للجاية بزر واحد.
    قبله ما كان فيه أي طريقة تتحرك فيها المرحلة، فكان الفريق يعلق عند «اختيار الموضوع». */
export default function StageAdvanceCard({ stages, autoData, projectTitle, isLeader, isFemale, updateStage, saveTitle }: StageAdvanceCardProps) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = [...stages].sort((a, b) => a.order - b.order).find((s) => s.status !== "done");
  if (!current) return null;
  const next = nextStageOf(stages, current);
  const prev = previousStageOf(stages, current);
  const ready = isStageReady(current, autoData, projectTitle);
  const nextAction = next ? STAGE_ACTION[next.stageKey] : undefined;

  const run = async (fn: () => Promise<{ error?: string }[] | { error?: string }>) => {
    setBusy(true);
    setError(null);
    const res = await fn();
    const failed = (Array.isArray(res) ? res : [res]).find((r) => r.error);
    if (failed) setError("ما قدرنا نحفظ التغيير — جرّبوا مرة ثانية، أو تأكدوا إنكم مسجلين الدخول وفريقكم مشترك.");
    setBusy(false);
  };

  const advance = () =>
    run(async () => {
      const today = toISODate(new Date());
      const first = await updateStage(current.id, { status: "done", progress: 100, completedDate: today });
      if (first.error || !next) return first;
      return updateStage(next.id, { status: "active", startDate: next.startDate ?? today });
    });

  const revert = () =>
    run(async () => {
      if (!prev) return {};
      const first = await updateStage(current.id, { status: "upcoming", progress: 0 });
      if (first.error) return first;
      return updateStage(prev.id, { status: "active", completedDate: null });
    });

  // ١) ما انكتب عنوان البحث — أول شي يتثبّت
  if (current.stageKey === "topic" && !ready) {
    return (
      <Card tone="amber" className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-accent-500 text-white">
            <PenLine size={22} />
          </span>
          <div>
            <p className="text-[11px] font-bold text-brand-950/45">الخطوة الأولى</p>
            <p className="text-base font-extrabold text-brand-950">ثبّتوا عنوان بحثكم</p>
          </div>
        </div>
        {isLeader ? (
          <form
            className="flex flex-wrap gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) run(() => saveTitle(draft.trim()));
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
          <p className="text-sm text-brand-950/65">قائد الفريق هو اللي يثبّت العنوان. {g(isFemale, "نبّهيه", "نبّهه")} إذا اتفقتم على الموضوع.</p>
        )}
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      </Card>
    );
  }

  // ٢) المرحلة مكتملة بمعاييرها — انقلوا للجاية
  if (ready && next && nextAction) {
    return (
      <Card tone="teal" className="space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white">
            <CheckCircle2 size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-brand-950/45">خلصتوا «{current.titleAr}»</p>
            <p className="text-base font-extrabold text-brand-950">المرحلة الجاية: {next.titleAr}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-brand-950/60">{nextAction.title} — {nextAction.why}</p>
          </div>
          <button onClick={advance} disabled={busy} className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50">
            انقلونا للجاية
            <ChevronsLeft size={16} />
          </button>
        </div>
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
        {prev && (
          <button onClick={revert} disabled={busy} className="flex items-center gap-1.5 text-[11px] font-bold text-brand-950/40 hover:text-brand-950/70">
            <Undo2 size={12} />
            رجّعوا «{prev.titleAr}»
          </button>
        )}
      </Card>
    );
  }

  // ٣) المرحلة جارية — توجيه + إنهاء يدوي لما الفريق يقرر
  return (
    <Card className="flex flex-wrap items-center gap-3 !py-3">
      <p className="min-w-0 flex-1 text-xs text-brand-950/60">
        مرحلتكم الحالية: <b className="text-brand-950">{current.titleAr}</b>
        {next && <> · الجاية: {next.titleAr}</>}
      </p>
      {STAGE_ACTION[current.stageKey] && (
        <Link to={STAGE_ACTION[current.stageKey].to} className="flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-900">
          كمّلوا الشغل <ArrowLeft size={13} />
        </Link>
      )}
      {next && (
        <button
          onClick={() => {
            if (window.confirm(`تأكدتم إنكم خلصتوا «${current.titleAr}» وتبون تنتقلون لـ «${next.titleAr}»؟`)) advance();
          }}
          disabled={busy}
          className="rounded-lg border border-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-surface-muted disabled:opacity-50"
        >
          خلّصنا هالمرحلة
        </button>
      )}
      {prev && (
        <button onClick={revert} disabled={busy} className="flex items-center gap-1.5 text-[11px] font-bold text-brand-950/40 hover:text-brand-950/70">
          <Undo2 size={12} />
          رجّعوا «{prev.titleAr}»
        </button>
      )}
      {error && <p className="w-full text-xs font-semibold text-rose-600">{error}</p>}
    </Card>
  );
}
