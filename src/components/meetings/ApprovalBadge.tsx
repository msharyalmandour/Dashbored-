import { CheckCheck, Clock, Pencil, Minus } from "lucide-react";
import type { ApprovalStatus } from "../../data/types";
import { APPROVAL_LABEL } from "../../lib/meetings";

const tone: Record<(typeof APPROVAL_LABEL)[ApprovalStatus]["tone"], string> = {
  muted: "border-white/15 bg-white/[0.04] text-[#B8ADA2]",
  amber: "border-[#FFB444]/40 bg-[#FFB444]/10 text-[#FFB444]",
  green: "border-[#7fd6a0]/40 bg-[#7fd6a0]/10 text-[#7fd6a0]",
  rose: "border-rose-400/40 bg-rose-500/10 text-rose-300",
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
