import { useState } from "react";
import { Check, Copy, ListTree, Loader2, Wand2 } from "lucide-react";
import Card from "../ui/Card";
import { useResearchAgent } from "../../hooks/useResearchAgent";
import type { SearchStrategy as Strategy } from "../../data/types";

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // نسخ يدوي لو الحافظة غير متاحة
    }
  };
  return (
    <div className="rounded-2xl bg-surface-muted p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-extrabold text-brand-950/70">{label}</p>
        <button onClick={copy} className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "تم النسخ" : "نسخ"}
        </button>
      </div>
      <p dir="ltr" className="break-words text-start font-mono text-[11px] leading-relaxed text-brand-950/75">
        {text}
      </p>
    </div>
  );
}

function ListBlock({ title, items, tone }: { title: string; items?: string[]; tone?: "brand" | "amber" }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-extrabold text-brand-950/70">{title}</p>
      <ul className="space-y-1">
        {items.map((it) => (
          <li
            key={it}
            className={`rounded-lg px-2.5 py-1.5 text-xs ${
              tone === "amber" ? "bg-amber-accent-50 text-amber-accent-700" : "bg-brand-50 text-brand-700"
            }`}
          >
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** استراتيجية بحث بأسلوب PRISMA من عنوان بحثكم: PICO، كلمات مفتاحية عربي/إنجليزي،
    جمل بحث جاهزة للصق بـ PubMed/CINAHL/Scopus، ومعايير القبول والاستبعاد. */
export default function SearchStrategy({ defaultTopic }: { defaultTopic: string }) {
  const { busy, buildStrategy } = useResearchAgent();
  const [topic, setTopic] = useState(defaultTopic);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = async () => {
    if (!topic.trim() || busy) return;
    setMessage(null);
    setStrategy(null);
    const r = await buildStrategy(topic.trim());
    if (r.message || !r.strategy) {
      setMessage(r.message ?? "تعذّر بناء الاستراتيجية — حاولوا مرة ثانية.");
      return;
    }
    setStrategy(r.strategy);
  };

  const pico = strategy?.pico;

  return (
    <div className="space-y-4">
      <Card tone="cream">
        <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-brand-950">
          <ListTree size={18} className="text-brand-500" />
          ابنوا استراتيجية البحث (PRISMA)
        </h3>
        <p className="mb-4 text-xs text-brand-950/50">
          كلمات مفتاحية وجمل بحث جاهزة ومعايير قبول واستبعاد — الدكاترة يطلبونها بمراجعة الأدبيات.
        </p>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="عنوان بحث التخرج..."
            className="w-full rounded-lg border border-brand-100 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
          />
          <button
            onClick={run}
            disabled={busy || !topic.trim()}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {busy ? "جاري البناء..." : "ابنِ الاستراتيجية"}
          </button>
        </div>
        {message && (
          <p className="mt-3 rounded-xl bg-amber-accent-50 px-3 py-2.5 text-sm font-medium text-amber-accent-700">{message}</p>
        )}
      </Card>

      {strategy && (
        <div className="space-y-4">
          {pico && (
            <Card>
              <p className="mb-3 text-sm font-extrabold text-brand-950">إطار PICO</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(
                  [
                    ["P — الفئة", pico.population],
                    ["I — المتغير / التدخل", pico.intervention],
                    ["C — المقارنة", pico.comparison],
                    ["O — النتيجة", pico.outcome],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-surface-muted p-2.5">
                    <p className="text-[11px] font-bold text-brand-950/40">{label}</p>
                    <p className="mt-0.5 text-xs text-brand-950/75">{value || "—"}</p>
                  </div>
                ))}
              </div>
              {pico.note && <p className="mt-2 text-xs text-brand-950/55">{pico.note}</p>}
            </Card>
          )}

          <Card className="space-y-4">
            <p className="text-sm font-extrabold text-brand-950">جمل البحث الجاهزة</p>
            {strategy.searchStrings?.pubmed && <CopyBlock label="PubMed" text={strategy.searchStrings.pubmed} />}
            {strategy.searchStrings?.cinahl && <CopyBlock label="CINAHL" text={strategy.searchStrings.cinahl} />}
            {strategy.searchStrings?.scopus && <CopyBlock label="Scopus" text={strategy.searchStrings.scopus} />}
            <p className="text-[11px] text-brand-950/45">
              هذي جمل مقترحة من الذكاء الاصطناعي: جرّبوها وعدّلوها حسب عدد النتائج، وتأكدوا من مصطلحات MeSH في MeSH Browser
              قبل اعتمادها.
            </p>
          </Card>

          <Card className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ListBlock title="كلمات مفتاحية (English)" items={strategy.keywordsEn} />
            <ListBlock title="كلمات مفتاحية (عربي)" items={strategy.keywordsAr} />
            <ListBlock title="MeSH مقترحة (تحقّقوا منها)" items={strategy.meshTerms} />
          </Card>

          <Card className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ListBlock title="معايير القبول" items={strategy.inclusion} />
            <ListBlock title="معايير الاستبعاد" items={strategy.exclusion} tone="amber" />
          </Card>

          {strategy.tips && strategy.tips.length > 0 && (
            <Card tone="sky">
              <ListBlock title="نصائح للتنفيذ والتوثيق" items={strategy.tips} />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
