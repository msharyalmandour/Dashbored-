import { Check } from "lucide-react";
import clsx from "clsx";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import ProgressBar from "../components/ui/ProgressBar";
import { researchPhases, teamMembers } from "../data/mockData";
import { formatDateShort } from "../lib/date";

const statusLabel = {
  done: "مكتملة",
  active: "قيد التنفيذ",
  upcoming: "قادمة",
};

const statusChip = {
  done: "text-brand-600 bg-brand-50",
  active: "text-amber-accent-600 bg-amber-accent-50",
  upcoming: "text-brand-950/40 bg-surface-muted",
};

export default function ResearchPlan() {
  const memberById = (id: string) => teamMembers.find((m) => m.id === id)!;
  const done = researchPhases.filter((p) => p.status === "done").length;

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-brand-950">خطة البحث الكاملة — 12 مرحلة</h2>
          <p className="mt-1 text-sm text-brand-950/50">
            تم إنجاز {done} من {researchPhases.length} مرحلة
          </p>
        </div>
        <div className="w-full max-w-xs">
          <ProgressBar value={(done / researchPhases.length) * 100} />
        </div>
      </Card>

      <div className="relative space-y-4 ps-8">
        <div className="absolute right-[15px] top-2 bottom-2 w-0.5 bg-brand-100" />
        {researchPhases.map((phase) => {
          const owner = memberById(phase.ownerId);
          return (
            <div key={phase.id} className="relative">
              <div
                className={clsx(
                  "absolute -right-8 top-5 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold",
                  phase.status === "done" && "border-brand-500 bg-brand-500 text-white",
                  phase.status === "active" && "border-brand-500 bg-white text-brand-600",
                  phase.status === "upcoming" && "border-brand-100 bg-white text-brand-950/30",
                )}
              >
                {phase.status === "done" ? <Check size={14} /> : phase.order}
              </div>

              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-brand-950">{phase.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusChip[phase.status]}`}>
                        {statusLabel[phase.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-brand-950/50">{phase.summary}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar initials={owner.initials} color={owner.color} size="sm" />
                    <span className="text-sm text-brand-950/60">{owner.name.split(" ")[0]}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="min-w-[140px] flex-1">
                    <ProgressBar value={phase.progress} />
                  </div>
                  <span className="text-xs font-semibold text-brand-950/45">
                    {formatDateShort(phase.startDate)} — {formatDateShort(phase.dueDate)}
                  </span>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
