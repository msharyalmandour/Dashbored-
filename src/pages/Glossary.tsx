import { useMemo, useState } from "react";
import { BookA, Search } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import { glossary, type GlossaryEntry } from "../data/glossary";

const groups: GlossaryEntry["group"][] = ["الإحصاء", "التصميم والعينة", "الأدوات والقياس", "الأدبيات", "الأخلاقيات"];

export default function Glossary() {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<GlossaryEntry["group"] | "all">("all");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return glossary.filter(
      (g) => (group === "all" || g.group === group) && (!t || `${g.ar} ${g.term} ${g.def}`.toLowerCase().includes(t)),
    );
  }, [q, group]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-brand-950">قاموس المصطلحات</h1>
        <p className="mt-1 text-sm leading-relaxed text-brand-950/55">
          أي كلمة بالبحث ما فهمتوها؟ هنا شرحها بالعربي البسيط. وبصفحات الموقع، المصطلحات اللي تحتها خط منقّط تضغطون عليها ويطلع شرحها مباشرة.
        </p>
      </div>
      <Card tone="cream" className="space-y-3">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-brand-950/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحثوا: p-value، الثبات، العينة..."
            className="w-full rounded-lg border border-brand-100 bg-paper py-2 pe-3 ps-9 text-sm outline-none focus:border-brand-300"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", ...groups] as const).map((gr) => (
            <button
              key={gr}
              onClick={() => setGroup(gr)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${group === gr ? "bg-brand-500 text-white" : "bg-paper text-brand-950/60 hover:bg-surface-muted"}`}
            >
              {gr === "all" ? "الكل" : gr}
            </button>
          ))}
        </div>
      </Card>
      {shown.length === 0 ? (
        <Card>
          <EmptyState icon={BookA} title="ما لقينا المصطلح" desc="جرّبوا كلمة ثانية، أو اقترحوا المصطلح من زر «اقترحوا ميزة» بأسفل القائمة." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {shown.map((g) => (
            <Card key={g.id} className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-extrabold text-brand-950">{g.ar}</p>
                <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold text-brand-950/45">{g.group}</span>
              </div>
              <p className="font-mono text-[11px] text-brand-950/40" dir="ltr">
                {g.term}
              </p>
              <p className="text-sm leading-relaxed text-brand-950/75">{g.def}</p>
              {g.example && <p className="rounded-xl bg-surface-muted px-3 py-2 text-xs text-brand-950/60">{g.example}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
