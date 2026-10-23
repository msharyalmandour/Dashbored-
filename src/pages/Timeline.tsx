import clsx from "clsx";
import { Link } from "react-router-dom";
import { Check, GraduationCap } from "lucide-react";
import { useResearchStages } from "../hooks/useResearchStages";
import { daysUntil, formatDateShort, parseDate } from "../lib/date";
import { getCurrentStage, getOverallProgress } from "../lib/progress";
import { HighlightCard, PageColumns, PageHeader, Panel, ghostBtn } from "../components/ui/page";
import RingProgress from "../components/ui/RingProgress";

const barColor = {
  done: "bg-gradient-to-l from-amber-accent-400 to-brand-500",
  active: "bg-gradient-to-l from-amber-accent-400 to-brand-500",
  upcoming: "bg-brand-500/25",
};

const monthMarks = [
  "2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01",
  "2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01", "2026-12-01",
];

const monthNames = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export default function Timeline() {
  const { stages, loading } = useResearchStages();

  if (loading || stages.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader kicker="الفريق" title="الجدول الزمني" subtitle="وين وصلتم، وكم باقي لكل مرحلة." />
        <Panel>
          <p className="text-center text-sm text-brand-950/45">جارٍ تحميل الجدول الزمني...</p>
        </Panel>
      </div>
    );
  }

  const ordered = [...stages].sort((a, b) => a.order - b.order);
  const dated = ordered.filter((s) => s.startDate && s.targetDate);
  const projectStart = dated[0]?.startDate ?? ordered[0].startDate;
  const projectEnd = dated[dated.length - 1]?.targetDate ?? ordered[ordered.length - 1].targetDate;

  const totalDays =
    projectStart && projectEnd
      ? (parseDate(projectEnd).getTime() - parseDate(projectStart).getTime()) / (1000 * 60 * 60 * 24)
      : 0;

  function offsetPct(date: string | null) {
    if (!date || !projectStart || totalDays === 0) return 0;
    const days = (parseDate(date).getTime() - parseDate(projectStart).getTime()) / (1000 * 60 * 60 * 24);
    return (days / totalDays) * 100;
  }

  const current = getCurrentStage(ordered);
  const overall = getOverallProgress(ordered);
  const daysLeft = projectEnd ? daysUntil(projectEnd) : null;

  return (
    <div className="space-y-6">
      <PageHeader kicker="الفريق" title="الجدول الزمني" subtitle="وين وصلتم، وكم باقي لكل مرحلة." />

      <PageColumns
        side={
          <>
            <HighlightCard
              kicker="الموعد النهائي"
              title={
                daysLeft === null
                  ? "غير محدد"
                  : daysLeft > 0
                    ? `باقي ${daysLeft} يوم`
                    : daysLeft === 0
                      ? "اليوم"
                      : `تأخرتم ${-daysLeft} يوم`
              }
              subtitle={projectEnd ? `تسليم البحث الكامل · ${formatDateShort(projectEnd)}` : undefined}
            />
            <Panel title="تقدّم البحث">
              <div className="flex items-center gap-4">
                <RingProgress value={overall} size={104} strokeWidth={10}>
                  <div className="text-center leading-tight">
                    <div className="font-display text-xl font-bold text-brand-950">{overall}%</div>
                    <div className="text-[11px] text-brand-950/50">مكتمل</div>
                  </div>
                </RingProgress>
                <div className="min-w-0">
                  <p className="text-sm text-brand-950/50">المرحلة الحالية</p>
                  <p className="font-display text-lg font-bold text-brand-950">{current?.titleAr ?? "خلصتوا كل المراحل"}</p>
                </div>
              </div>
            </Panel>
            <Panel>
              <p className="text-sm font-semibold text-brand-950/80">
                🎓 هذي آخر محطة برحلتكم — يوم تسلّمون البحث النهائي، سجّلوا اللحظة.
              </p>
              <Link to="/celebration" className={clsx(ghostBtn, "mt-3 w-full")}>
                <GraduationCap size={15} />
                تسليم البحث النهائي
              </Link>
            </Panel>
          </>
        }
        main={
          <>
            <Panel title="رحلة البحث" hint={current ? `أنتم في المرحلة ${current.order}` : undefined}>
              <ol className="flex gap-2 overflow-x-auto pb-2">
                {ordered.map((s, i) => {
                  const isCurrent = current?.id === s.id;
                  const done = s.status === "done";
                  return (
                    <li key={s.id} className="flex min-w-[96px] flex-1 flex-col items-center gap-2 text-center">
                      <div className="flex w-full items-center">
                        <span className={clsx("h-px flex-1", i === 0 ? "bg-transparent" : done || isCurrent ? "bg-brand-500" : "bg-brand-500/25")} />
                        <span
                          className={clsx(
                            "flex shrink-0 items-center justify-center rounded-full border-2 font-bold",
                            isCurrent
                              ? "h-14 w-14 border-amber-accent-400 bg-[#2a0e04] text-lg text-amber-accent-400 shadow-[0_0_0_6px_rgba(255,179,71,0.14)]"
                              : done
                                ? "h-11 w-11 border-amber-accent-400 bg-amber-accent-400/15 text-amber-accent-400"
                                : "h-11 w-11 border-brand-500/30 text-brand-950/50",
                          )}
                        >
                          {done ? <Check size={16} strokeWidth={3} /> : s.order}
                        </span>
                        <span className={clsx("h-px flex-1", i === ordered.length - 1 ? "bg-transparent" : done ? "bg-brand-500" : "bg-brand-500/25")} />
                      </div>
                      <span className={clsx("text-xs leading-snug", isCurrent ? "font-bold text-brand-950" : "text-brand-950/55")}>
                        {s.titleAr}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Panel>

            <Panel title="الجدول الزمني للبحث" hint={`${projectStart ? formatDateShort(projectStart) : ""} — ${projectEnd ? formatDateShort(projectEnd) : ""}`}>
              <div className="relative overflow-x-auto">
                <div className="min-w-[720px]">
                  <div className="relative mb-3 ms-48 h-5 border-b border-brand-100/20">
                    {monthMarks.map((m) => (
                      <span
                        key={m}
                        className="absolute -translate-x-1/2 text-[11px] font-semibold text-brand-950/40 rtl:translate-x-1/2"
                        style={{ right: `${offsetPct(m)}%` }}
                      >
                        {monthNames[parseDate(m).getMonth()]}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {ordered.map((stage) => {
                      const left = offsetPct(stage.startDate);
                      const width = offsetPct(stage.targetDate) - left;
                      return (
                        <div key={stage.id} className="flex items-center gap-4">
                          <div className="w-44 shrink-0 truncate text-sm font-medium text-brand-950/80">
                            {stage.order}. {stage.titleAr}
                          </div>
                          <div className="relative h-4 flex-1 rounded-full bg-black/30">
                            <div
                              className={clsx("absolute top-0 h-4 rounded-full", barColor[stage.status])}
                              style={{ width: `${Math.max(width, 2)}%`, right: `${left}%` }}
                              title={
                                stage.startDate && stage.targetDate
                                  ? `${formatDateShort(stage.startDate)} — ${formatDateShort(stage.targetDate)}`
                                  : undefined
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-brand-950/50">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> مكتملة / قيد التنفيذ
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-500/30" /> قادمة
                </span>
              </div>
            </Panel>
          </>
        }
      />
    </div>
  );
}
