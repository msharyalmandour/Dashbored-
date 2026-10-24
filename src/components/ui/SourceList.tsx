import { ExternalLink } from "lucide-react";
import type { AgentPaper } from "../../hooks/useProjectAgent";
import { tr } from "../../lib/i18n";

/** «بُنيت على:» — روابط الدراسات الحقيقية اللي استند عليها الاقتراح (أرقام موقعها بقائمة الدراسات) */
export default function SourceList({ papers, sources }: { papers: AgentPaper[]; sources: number[] }) {
  const list = sources.map((i) => papers[i]).filter(Boolean);
  if (list.length === 0) return null;
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-950/50">
      <span className="font-semibold">{tr("مبنية على:")}</span>
      {list.map((p, i) => (
        <a key={i} href={p.url} target="_blank" rel="noreferrer" className="inline-flex max-w-[16rem] items-center gap-1 text-amber-accent-400 hover:underline" title={p.title}>
          <span className="truncate" dir="ltr">
            {p.authors.split(",")[0] || "Study"} {p.year ?? ""}
          </span>
          <ExternalLink size={11} className="shrink-0" />
        </a>
      ))}
    </p>
  );
}
