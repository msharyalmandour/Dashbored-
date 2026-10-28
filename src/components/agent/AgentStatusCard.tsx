import { CalendarClock, Flag, ListChecks } from "lucide-react";
import type { StatusSnapshot } from "../../lib/agentExtras";
import { formatDateLong } from "../../lib/date";
import { tr, trx } from "../../lib/i18n";

/** بطاقة «وضع المشروع» داخل رد الوكيل. للمصمم: كل التنسيق بهذا الملف فقط (الألوان من هوية Wesync الثابتة)،
    والبيانات تجي جاهزة من lib/agentExtras.ts. data-agent="…" للتتبع والاختبار. */
export default function AgentStatusCard({ status }: { status: StatusSnapshot }) {
  const tile = "rounded-2xl border border-white/[0.12] bg-white/[0.03] px-3 py-2.5";
  return (
    <div data-agent="status-card" className="mt-3 space-y-3 rounded-2xl border border-[rgba(255,107,0,.3)] p-3.5">
      <div>
        <div className="flex items-baseline justify-between text-xs text-[#B8ADA2]">
          <span>{tr("إنجاز المهام")}</span>
          <span className="text-sm font-extrabold tabular-nums text-[#F4F0EC]">{status.percent}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={status.percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-l from-[#FFB444] to-[#FF6B00]" style={{ width: `${status.percent}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-[#B8ADA2]">{trx("{0} من {1} مهمة منجزة", status.done, status.total)}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[13px]">
        <div className={tile}>
          <p className="flex items-center gap-1.5 text-[11px] text-[#B8ADA2]">
            <ListChecks size={12} /> {tr("متأخرة")}
          </p>
          <p className={status.overdue > 0 ? "mt-0.5 text-lg font-extrabold text-[#ff8a8a]" : "mt-0.5 text-lg font-extrabold text-[#7fd6a0]"}>{status.overdue}</p>
        </div>
        <div className={tile}>
          <p className="flex items-center gap-1.5 text-[11px] text-[#B8ADA2]">
            <Flag size={12} /> {tr("المرحلة")}
          </p>
          <p className="mt-0.5 font-bold leading-tight">{status.stage?.title ?? "—"}</p>
          {status.stage && <p className="text-[11px] tabular-nums text-[#B8ADA2]">{status.stage.progress}%</p>}
        </div>
      </div>

      {status.nextEvent && (
        <p className="flex items-center gap-2 text-[13px] text-[#E6DBD1]">
          <CalendarClock size={14} className="shrink-0 text-[#FFB444]" />
          <span>
            {status.nextEvent.title} — {formatDateLong(status.nextEvent.date)}
            <span className="text-[#B8ADA2]"> · {status.nextEvent.inDays === 0 ? tr("اليوم") : trx("بعد {0} يوم", status.nextEvent.inDays)}</span>
          </span>
        </p>
      )}
      {status.nextTask && (
        <p className="text-[12px] text-[#B8ADA2]">
          {tr("أقرب مهمة:")} <span className="text-[#E6DBD1]">{status.nextTask.title}</span>
        </p>
      )}
    </div>
  );
}
