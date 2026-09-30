import { useMemo, useState } from "react";
import { ExternalLink, Library, Ruler, Search } from "lucide-react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import { useValidatedTools } from "../hooks/useValidatedTools";
import { isSupabaseConfigured } from "../lib/supabaseClient";

/** مكتبة أدوات القياس المشتركة — تتراكم من عمليات «أدوات القياس» بوكيل البحث لما أي فريق يحفظ أداة.
    كل أداة مربوطة بدراستها الأصلية؛ تحقّقوا دايمًا من الدراسة والإذن قبل الاستخدام. */
export default function ToolsLibrary() {
  const { tools, loading } = useValidatedTools();
  const [q, setQ] = useState("");
  const [arabicOnly, setArabicOnly] = useState(false);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return tools.filter(
      (x) =>
        (!arabicOnly || x.isArabic) &&
        (!t || [x.toolName, x.measures, x.population, x.languages].some((f) => f.toLowerCase().includes(t))),
    );
  }, [tools, q, arabicOnly]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-brand-950">مكتبة أدوات القياس</h1>
        <p className="mt-1 text-sm leading-relaxed text-brand-950/55">
          استبيانات ومقاييس موثّقة جمعتها الفرق من دراسات حقيقية، مع ثباتها ولغاتها ورابط دراستها الأصلية. تكبر كل ما فريق يحفظ أداة من «وكيل البحث ←
          أدوات القياس». ما فيها أي بيانات فرق — فقط معلومات الأداة من الدراسة المنشورة.
        </p>
      </div>

      <Card tone="cream" className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-brand-950/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحثوا: الاحتراق، الرضا، الألم..."
            className="w-full rounded-lg border border-brand-100 bg-paper py-2 pe-3 ps-9 text-sm outline-none focus:border-brand-300"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand-950/70">
          <input type="checkbox" checked={arabicOnly} onChange={(e) => setArabicOnly(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand-500)]" />
          فيها نسخة عربية فقط
        </label>
        <Link to="/research-search" className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600">
          <Ruler size={15} /> دوّروا أداة جديدة
        </Link>
      </Card>

      {loading ? (
        <p className="text-sm text-brand-950/45">جاري التحميل...</p>
      ) : !isSupabaseConfigured ? (
        <Card>
          <EmptyState icon={Library} title="متاحة بالوضع الحقيقي فقط" desc="المكتبة مشتركة بين الفرق وتتطلب حساب فريق." />
        </Card>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={Library}
            title={tools.length === 0 ? "المكتبة فاضية لسا" : "ما فيه نتائج"}
            desc={tools.length === 0 ? "كونوا أول من يضيف: دوّروا أداة بوكيل البحث واضغطوا «احفظوها بالمكتبة»." : "جرّبوا كلمة ثانية أو ألغوا فلتر العربي."}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {shown.map((t) => (
            <Card key={t.id} className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-extrabold text-brand-950">{t.toolName}</p>
                  {t.measures && <p className="mt-0.5 text-xs text-brand-950/55">{t.measures}</p>}
                </div>
                {t.isArabic && <span className="shrink-0 rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-bold text-brand-700">عربي</span>}
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
                    <p className="mt-0.5 text-brand-950/75">{value || "غير مذكور"}</p>
                  </div>
                ))}
              </div>
              {t.sourceUrl && (
                <a href={t.sourceUrl} target="_blank" rel="noreferrer" className="flex items-start gap-1.5 text-[11px] font-semibold text-brand-600 hover:underline">
                  <ExternalLink size={12} className="mt-0.5 shrink-0" />
                  <span>
                    {t.sourceTitle || "الدراسة الأصلية"}
                    {t.year ? <span className="font-normal text-brand-950/40"> · {t.year}</span> : null}
                  </span>
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
      <p className="text-center text-[11px] text-brand-950/40">
        المعلومات مستخرجة آليًا من ملخصات الدراسات وقد تحتوي أخطاء — تحقّقوا من الدراسة الأصلية وخذوا إذن صاحب الأداة قبل استخدامها.
      </p>
    </div>
  );
}
