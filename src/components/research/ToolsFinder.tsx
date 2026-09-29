import { useState } from "react";
import { ExternalLink, Loader2, Ruler, Search, ShieldAlert } from "lucide-react";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import { useResearchAgent } from "../../hooks/useResearchAgent";
import type { ToolFinding } from "../../data/types";

/** «دوّري لنا أداة معتمدة» — يقترح استبيانات/مقاييس موثّقة لمتغير بحثكم مع ثباتها
    ولغاتها، مبنية على ملخصات دراسات حقيقية (كل أداة مربوطة بدراستها الأصلية) */
export default function ToolsFinder() {
  const { busy, findTools } = useResearchAgent();
  const [construct, setConstruct] = useState("");
  const [population, setPopulation] = useState("");
  const [tools, setTools] = useState<ToolFinding[] | null>(null);
  const [caveat, setCaveat] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const run = async () => {
    if (!construct.trim() || busy) return;
    setMessage(null);
    setTools(null);
    const r = await findTools(construct.trim(), population.trim());
    if (r.message) {
      setMessage(r.message);
      return;
    }
    setTools(r.tools);
    setCaveat(r.caveat);
  };

  return (
    <div className="space-y-4">
      <Card tone="cream">
        <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-brand-950">
          <Ruler size={18} className="text-brand-500" />
          دوّروا لنا أداة قياس معتمدة
        </h3>
        <p className="mb-4 text-xs text-brand-950/50">
          اكتبوا المتغير اللي تبون تقيسونه (مثل: الإجهاد المهني، رضا المرضى، الاحتراق الوظيفي)، ونقترح استبيانات
          موثّقة من دراسات حقيقية.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_auto]">
          <input
            value={construct}
            onChange={(e) => setConstruct(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="المتغير: مثل الاحتراق الوظيفي"
            className="w-full rounded-lg border border-brand-100 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
          />
          <input
            value={population}
            onChange={(e) => setPopulation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="الفئة (اختياري): ممرضات العناية المركزة"
            className="w-full rounded-lg border border-brand-100 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
          />
          <button
            onClick={run}
            disabled={busy || !construct.trim()}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {busy ? "جاري البحث..." : "دوّر"}
          </button>
        </div>
        {busy && (
          <p className="mt-3 text-xs text-brand-950/45">
            نبحث في PubMed وOpenAlex عن دراسات تطوير وتحقق للمقاييس، ثم نستخرج بيانات كل أداة — ياخذ غالبًا ١٠–٢٠ ثانية.
          </p>
        )}
        {message && (
          <p className="mt-3 rounded-xl bg-amber-accent-50 px-3 py-2.5 text-sm font-medium text-amber-accent-700">{message}</p>
        )}
      </Card>

      {tools && tools.length > 0 && (
        <>
          {caveat && (
            <p className="flex items-start gap-2 rounded-2xl bg-amber-accent-50 px-4 py-3 text-xs font-semibold text-amber-accent-700">
              <ShieldAlert size={15} className="mt-0.5 shrink-0" />
              {caveat}
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {tools.map((t, i) => (
              <Card key={`${t.toolName}-${i}`} className="space-y-2.5">
                <div>
                  <p className="text-sm font-extrabold text-brand-950">{t.toolName}</p>
                  {t.measures && <p className="mt-0.5 text-xs text-brand-950/55">{t.measures}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {[
                    ["الفقرات", t.items],
                    ["الثبات", t.reliability],
                    ["اللغات", t.languages],
                    ["الفئة", t.population],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-surface-muted p-2">
                      <p className="font-bold text-brand-950/40">{label}</p>
                      <p className="mt-0.5 text-brand-950/75">{value || "غير مذكور بالملخص"}</p>
                    </div>
                  ))}
                </div>
                {t.notes && <p className="text-xs text-brand-950/60">{t.notes}</p>}
                <a
                  href={t.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-1.5 text-[11px] font-semibold text-brand-600 hover:underline"
                >
                  <ExternalLink size={12} className="mt-0.5 shrink-0" />
                  <span>
                    {t.sourceTitle}
                    <span className="block font-normal text-brand-950/40">
                      {[t.authors, t.year, t.journal].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </a>
              </Card>
            ))}
          </div>
        </>
      )}
      {tools && tools.length === 0 && (
        <EmptyState
          icon={Ruler}
          title="ما لقينا أدوات واضحة"
          desc="جربوا صياغة ثانية للمتغير (بالإنجليزي أحيانًا تعطي نتائج أفضل)، أو اذكروا الفئة."
        />
      )}
    </div>
  );
}
