import { useMemo, useState } from "react";
import { Check, Copy, Info } from "lucide-react";
import Card, { CardHeader } from "./ui/Card";
import Avatar from "./ui/Avatar";
import type { Task, TeamMember } from "../data/types";
import { computeContribution } from "../lib/contribution";
import { toISODate } from "../lib/date";

/** مساهمة كل عضو من المهام المكتملة (النقاط حسب الأولوية) + الالتزام بالموعد — مؤشر نقاش للفريق مو درجة تقييم. */
export default function ContributionCard({ roster, tasks }: { roster: TeamMember[]; tasks: Task[] }) {
  const [copied, setCopied] = useState(false);
  const summary = useMemo(
    () =>
      computeContribution(
        roster.map((m) => m.id),
        tasks.map((t) => ({ assigneeId: t.assigneeId, status: t.status, priority: t.priority, dueDate: t.dueDate, completedAt: t.completedAt })),
        toISODate(new Date()),
      ),
    [roster, tasks],
  );

  if (roster.length === 0 || summary.totalPoints === 0) {
    return (
      <Card className="card-terra mt-4">
        <CardHeader title="مساهمة الأعضاء" subtitle="Contribution" />
        <p className="text-sm text-brand-950/55">تظهر هنا حصة كل عضو لما تنكمل أول المهام.</p>
      </Card>
    );
  }

  const byId = new Map(roster.map((m) => [m.id, m]));
  const rows = [...summary.rows].sort((a, b) => b.share - a.share);
  const name = (id: string) => byId.get(id)?.name.split(" ")[0] ?? "؟";

  const copy = async () => {
    const lines = [
      "مساهمة الأعضاء (من المهام المكتملة)",
      "",
      ...rows.map((r) => `${name(r.memberId)}: ${r.share}٪ — ${r.done} مهمة مكتملة${r.onTimeRate !== null ? ` — ${r.onTimeRate}٪ بالموعد` : ""}${r.overdue ? ` — ${r.overdue} متأخرة` : ""}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* النسخ غير متاح */
    }
  };

  return (
    <Card className="card-terra mt-4">
      <CardHeader
        title="مساهمة الأعضاء"
        subtitle="Contribution"
        action={
          <button onClick={copy} className="flex items-center gap-1.5 rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-50">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "تم النسخ" : "نسخ"}
          </button>
        }
      />
      <ul className="space-y-3">
        {rows.map((r) => {
          const m = byId.get(r.memberId);
          if (!m) return null;
          return (
            <li key={r.memberId} className="flex items-center gap-3">
              <Avatar initials={m.initials} color={m.color} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-semibold text-brand-950">{name(r.memberId)}</span>
                  <span className="shrink-0 text-xs font-bold text-brand-950/55">
                    {r.share}٪ · {r.done} مكتملة
                    {r.onTimeRate !== null && <span className="text-brand-950/40"> · {r.onTimeRate}٪ بالموعد</span>}
                    {r.overdue > 0 && <span className="text-rose-500"> · {r.overdue} متأخرة</span>}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-brand-100" role="img" aria-label={`حصة ${name(r.memberId)} ${r.share}٪`}>
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${r.share}%` }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {summary.dominantId && (
        <p className="mt-3 rounded-xl bg-amber-50 p-2.5 text-xs font-semibold text-amber-800">
          {name(summary.dominantId)} ماسكة/ماسك أكثر من نصف الإنجاز. جرّبوا توزّعون المهام الجاية بشكل أوزن.
        </p>
      )}
      {summary.idleIds.length > 0 && (
        <p className="mt-2 rounded-xl bg-amber-50 p-2.5 text-xs font-semibold text-amber-800">
          ما سجّل إنجاز لحد الحين: {summary.idleIds.map(name).join("، ")}. يمكن يحتاج مهمة أوضح أو مساعدة — اسألوه/ا بدل ما تفترضون.
        </p>
      )}
      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-brand-950/45">
        <Info size={12} className="mt-0.5 shrink-0" />
        الحصة محسوبة من المهام المكتملة بس (العالية ٣ نقاط، المتوسطة ٢، المنخفضة ١). ما تقيس القراءة والاجتماعات والكتابة اللي ما تنسجّل كمهام، فاستخدموها للنقاش بين الفريق مو كتقييم.
      </p>
    </Card>
  );
}
