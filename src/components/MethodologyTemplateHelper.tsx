import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import clsx from "clsx";
import Card, { CardHeader } from "./ui/Card";
import { methodologyTemplates, type MethodologyTemplate } from "../data/methodologyTemplates";

function buildTemplateText(t: MethodologyTemplate): string {
  return `تصميم الدراسة:
${t.studyDesign}

معايير الاشتمال:
${t.inclusionCriteria.map((c) => `- ${c}`).join("\n")}

معايير الاستبعاد:
${t.exclusionCriteria.map((c) => `- ${c}`).join("\n")}

أسلوب اختيار العينة:
${t.samplingTechnique}

طريقة جمع البيانات:
${t.dataCollectionMethods.map((c) => `- ${c}`).join("\n")}

أداة الدراسة المقترحة:
${t.suggestedTool}`;
}

/** قوالب مبدئية حسب نوع الدراسة — نقطة بداية جاهزة للنسخ بدل الصفحة
    الفاضية، تحتاج تعديل حسب دراستكم الفعلية قبل الاعتماد النهائي.
    القالب نفسه اقتراح ثابت فقط — لا يُحفظ ولا يتغيّر؛ "تطبيق القالب"
    (لو مُرِّر onApply) ينسخ قيمه لحقول المنهجية الحقيقية القابلة للتعديل،
    فيبقى الفرق واضح بين الاقتراح والبيانات المحفوظة فعليًا. */
export default function MethodologyTemplateHelper({
  onApply,
}: {
  onApply?: (template: MethodologyTemplate) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const active = methodologyTemplates.find((t) => t.id === activeId) ?? null;

  const copy = async () => {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(buildTemplateText(active));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // نسخ يدوي لو الحافظة غير متاحة
    }
  };

  return (
    <Card tone="sky">
      <CardHeader
        title="قوالب جاهزة تساعدكم تبدؤون"
        subtitle="Starter Templates"
        action={<Sparkles size={18} className="text-sky-accent-600" />}
      />
      <p className="mb-3 text-sm text-brand-950/55">
        اختاروا أقرب نوع لدراستكم، وبنقترح لكم هيكل مبدئي (معايير اشتمال، أسلوب عينة، طريقة جمع
        بيانات) تعدّلونه حسب دراستكم الفعلية — بدل ما تبدؤون من صفحة فاضية.
      </p>
      <div className="flex flex-wrap gap-2">
        {methodologyTemplates.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveId(t.id === activeId ? null : t.id)}
            className={clsx(
              "rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors",
              activeId === t.id
                ? "bg-sky-accent-500 text-white"
                : "bg-paper text-brand-950/60 hover:bg-surface-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active && (
        <div className="mt-4 space-y-3 rounded-2xl bg-surface-muted p-4">
          <div>
            <p className="text-xs font-bold text-brand-950/45">تصميم الدراسة</p>
            <p className="mt-0.5 text-sm text-brand-950/80">{active.studyDesign}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold text-brand-950/45">معايير الاشتمال</p>
              <ul className="mt-1 space-y-1">
                {active.inclusionCriteria.map((c, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-brand-950/70">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-brand-950/45">معايير الاستبعاد</p>
              <ul className="mt-1 space-y-1">
                {active.exclusionCriteria.map((c, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-brand-950/70">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-rose-400" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-brand-950/45">أسلوب اختيار العينة</p>
            <p className="mt-0.5 text-sm text-brand-950/80">{active.samplingTechnique}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-brand-950/45">طريقة جمع البيانات</p>
            <ul className="mt-1 space-y-1">
              {active.dataCollectionMethods.map((c, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-brand-950/70">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold text-brand-950/45">أداة الدراسة المقترحة</p>
            <p className="mt-0.5 text-sm text-brand-950/80">{active.suggestedTool}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={copy}
              className="flex items-center gap-2 rounded-xl bg-sky-accent-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-accent-600"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "تم نسخ القالب" : "نسخ القالب"}
            </button>
            {onApply && (
              <button
                onClick={() => onApply(active)}
                className="flex items-center gap-2 rounded-xl border border-sky-accent-300 bg-paper px-4 py-2.5 text-sm font-bold text-sky-accent-700 hover:bg-sky-accent-50"
              >
                <Sparkles size={16} />
                تعبئة حقول المنهجية بهذا القالب
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
