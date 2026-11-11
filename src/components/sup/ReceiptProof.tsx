import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCommitments } from "../../hooks/useCommitments";
import { attachProof } from "../../lib/commitments";
import { tr } from "../../lib/i18n";
import type { Task } from "../../data/types";

/** مهمة من طلب الدكتورة: ملف الإثبات يوصلها مع «طلبك خلص ✓» */
export default function ReceiptProof({ task }: { task: Task }) {
  const { team, canWrite } = useAuth();
  const { items, patchLocal } = useCommitments();
  const c = items.find((x) => x.id === task.commitmentId);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!c || !team) return null;
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setMsg(null);
    const r = await attachProof(team.id, c.id, f);
    setBusy(false);
    if (r.error) return setMsg(r.error);
    patchLocal(c.id, { proof_name: f.name });
    setMsg(tr("انرفع ✓ يوصل الدكتورة مع الإيصال"));
  };
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-2xl px-3 py-2.5" style={{ background: "rgba(255,199,119,0.06)", boxShadow: "inset 0 0 0 1px rgba(255,199,119,0.18)" }}>
      <div className="min-w-0 flex-1 text-[13px] leading-[1.5]">
        <b className="block text-[#FFC777]">{tr("ملف للإيصال")}</b>
        <span className="text-[var(--ws-c-muted)]" dir="auto">
          {c.proof_name ? c.proof_name : tr("لما تخلص المهمة يوصل الدكتورة «طلبك خلص ✓» ومعه هالملف")}
        </span>
        {msg && (
          <span className="mt-0.5 block text-[#FFC777]" role="status">
            {msg}
          </span>
        )}
      </div>
      <input ref={input} type="file" hidden onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }} />
      <button type="button" className="v3-bd inline-flex min-h-[44px] items-center gap-1.5" disabled={busy || !canWrite} onClick={() => input.current?.click()}>
        <FileUp size={15} aria-hidden />
        {c.proof_name ? tr("غيّروا الملف") : tr("أرفقوا الملف")}
      </button>
    </div>
  );
}
