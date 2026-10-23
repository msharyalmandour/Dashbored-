import { CheckCheck, Clock, Pencil, Minus } from "lucide-react";
import type { ApprovalStatus } from "../../data/types";
import { APPROVAL_LABEL } from "../../lib/meetings";

const tone: Record<(typeof APPROVAL_LABEL)[ApprovalStatus]["tone"], string> = {
  muted: "border-brand-100 bg-surface-muted text-brand-950/50",
  amber: "border-amber-accent-300/50 bg-amber-accent-100/40 text-amber-accent-700",
  green: "border-emerald-400/30 bg-emerald-500/10 text-emerald-500",
  rose: "border-rose-300/40 bg-rose-500/10 text-rose-500",
};

const icon: Record<ApprovalStatus, typeof Clock> = {
  none: Minus,
  pending: Clock,
  approved: CheckCheck,
  auto_approved: CheckCheck,
  changes_requested: Pencil,
};

/** حالة اعتماد المشرف/ة للمحضر */
export default function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const meta = APPROVAL_LABEL[status];
  const Icon = icon[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${tone[meta.tone]}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
}
