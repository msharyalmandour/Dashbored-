import { CheckCheck, Clock, Pencil, Minus } from "lucide-react";
import type { ApprovalStatus } from "../../data/types";
import { APPROVAL_LABEL } from "../../lib/meetings";

const tone: Record<(typeof APPROVAL_LABEL)[ApprovalStatus]["tone"], string> = {
  muted: "border-white/15 bg-white/[0.04] text-ws-muted",
  amber: "border-ws-accent3/40 bg-ws-accent3/10 text-ws-accent3",
  green: "border-ws-accent3/40 bg-ws-accent3/10 text-ws-accent3",
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
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-bold ${tone[meta.tone]}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
}
