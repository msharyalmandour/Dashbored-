import clsx from "clsx";
import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import Card from "../components/ui/Card";
import { useResearchStages } from "../hooks/useResearchStages";
import { formatDateShort, parseDate } from "../lib/date";

const barColor = {
  done: "bg-brand-500",
  active: "bg-amber-accent-400",
  upcoming: "bg-brand-100",
};

const monthMarks = [
  "2026-02-01", "2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01",
  "2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01", "2026-12-01",
];

function formatShortMonth(iso: string) {
  const months = [
    "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو",
    "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ];
  const idx = parseDate(iso).getMonth() - 1;
  return months[idx] ?? "";
}

export default function Timeline() {
  const { stages, loading } = useResearchStages();

  if (loading || stages.length === 0) {
    return <Card tone="cream" className="text-center text-sm text-brand-950/45">جارٍ تحميل الجدول الزمني...</Card>;
  }

  const dated = stages.filter((s) => s.startDate && s.targetDate);
  const projectStart = dated[0]?.startDate ?? stages[0].startDate;
  const projectEnd = dated[dated.length - 1]?.targetDate ?? stages[stages.length - 1].targetDate;

  const totalDays =
    projectStart && projectEnd
      ? (parseDate(projectEnd).getTime() - parseDate(projectStart).getTime()) / (1000 * 60 * 60 * 24)
      : 0;

  function offsetPct(date: string | null) {
    if (!date || !projectStart || totalDays === 0) return 0;
    const days = (parseDate(date).getTime() - parseDate(projectStart).getTime()) / (1000 * 60 * 60 * 24);
    return (days / totalDays) * 100;
  }

  return (
    <Card tone="cream">
      <h2 className="font-display mb-1 text-base font-bold text-brand-950">الجدول الزمني للبحث</h2>
      <p className="mb-6 text-sm text-brand-950/50">
        {projectStart && formatDateShort(projectStart)} — {projectEnd && formatDateShort(projectEnd)}
      </p>

      <div className="relative overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="relative mb-3 h-5 border-b border-brand-100">
            {monthMarks.map((m) => (
              <span
                key={m}
                className="absolute -translate-x-1/2 text-[11px] font-semibold text-brand-950/40 rtl:translate-x-1/2"
                style={{ right: `${offsetPct(m)}%` }}
              >
                {formatShortMonth(m)}
              </span>
            ))}
          </div>

          <div className="space-y-3">
            {stages.map((stage) => {
              const left = offsetPct(stage.startDate);
              const width = offsetPct(stage.targetDate) - left;
              return (
                <div key={stage.id} className="flex items-center gap-3">
                  <div className="w-44 shrink-0 truncate text-sm font-medium text-brand-950/80">
                    {stage.order}. {stage.titleAr}
                  </div>
                  <div className="relative h-6 flex-1 rounded-full bg-surface-muted">
                    <div
                      className={clsx("absolute top-0 h-6 rounded-full", barColor[stage.status])}
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

      <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold text-brand-950/50">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> مكتملة
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-accent-400" /> قيد التنفيذ
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-100" /> قادمة
        </span>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3">
        <p className="text-sm font-semibold text-brand-700">
          🎓 هذي آخر محطة برحلتكم — يوم تسلّمون البحث النهائي، سجّلوا اللحظة.
        </p>
        <Link
          to="/celebration"
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white hover:bg-brand-600"
        >
          <GraduationCap size={15} />
          تسليم البحث النهائي
        </Link>
      </div>
    </Card>
  );
}
