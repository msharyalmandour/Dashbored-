import { useMemo, useState } from "react";
import { BookMarked, FileText, ScrollText, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import { references, teamMembers } from "../data/mockData";
import type { ReferenceItem } from "../data/types";

const typeIcon: Record<ReferenceItem["type"], typeof FileText> = {
  article: FileText,
  book: BookMarked,
  report: ScrollText,
  guideline: ShieldCheck,
};

const typeLabel: Record<ReferenceItem["type"], string> = {
  article: "مقالة علمية",
  book: "كتاب",
  report: "تقرير",
  guideline: "دليل إرشادي",
};

const typeFilters = [
  { id: "all", label: "الكل" },
  { id: "article", label: "مقالات" },
  { id: "book", label: "كتب" },
  { id: "report", label: "تقارير" },
  { id: "guideline", label: "أدلة" },
];

export default function References() {
  const [filter, setFilter] = useState("all");
  const memberById = (id: string) => teamMembers.find((m) => m.id === id)!;

  const filtered = useMemo(
    () => references.filter((r) => filter === "all" || r.type === filter),
    [filter],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {typeFilters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={clsx(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              filter === f.id
                ? "bg-brand-500 text-white"
                : "bg-paper text-brand-950/60 hover:bg-surface-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((ref) => {
          const Icon = typeIcon[ref.type];
          const addedBy = memberById(ref.addedById);
          return (
            <Card key={ref.id} className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug text-brand-950">{ref.title}</p>
                <p className="mt-1 text-sm text-brand-950/50">
                  {ref.authors} · {ref.year}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-brand-950/50">
                    {typeLabel[ref.type]}
                  </span>
                  {ref.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-sky-accent-50 px-2 py-0.5 text-[11px] font-bold text-sky-accent-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-brand-950/40">
                  <Avatar initials={addedBy.initials} color={addedBy.color} size="sm" />
                  أضافها {addedBy.name.split(" ")[0]}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
