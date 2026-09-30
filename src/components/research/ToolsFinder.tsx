import { useState } from "react";
import { Link } from "react-router-dom";
import { BookmarkPlus, Check, ExternalLink, Loader2, Ruler, Search, ShieldAlert } from "lucide-react";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import { useResearchAgentState } from "../../context/ResearchAgentContext";
import { useAuth } from "../../context/AuthContext";
import Term from "../Term";
import { saveToolToLibrary } from "../../hooks/useValidatedTools";
import type { ToolFinding } from "../../data/types";

function SaveToLibrary({ tool }: { tool: ToolFinding }) {
  const { currentUser } = useAuth();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "dup" | "error">("idle");
  if (!currentUser) return null;
  return (
    <button
      disabled={state === "saving" || state === "saved" || state === "dup"}
      onClick={async () => {
        setState("saving");
        const r = await saveToolToLibrary(tool, currentUser.id);
        setState(r.error ? "error" : r.duplicate ? "dup" : "saved");
      }}
      className="flex items-center gap-1.5 text-[11px] font-bold text-brand-600 hover:underline disabled:opacity-70"
    >
      {state === "saving" ? <Loader2 size={12} className="animate-spin" /> : state === "saved" || state === "dup" ? <Check size={12} /> : <BookmarkPlus size={12} />}
      {state === "saved" ? "انحفظت بالمكتبة المشتركة" : state === "dup" ? "موجودة بالمكتبة أصلًا" : state === "error" ? "تعذّر الحفظ — حاولوا مرة ثانية" : "احفظوها بمكتبة الأدوات"}
    </button>
  );
}

const examples: [string, string][] = [
  ["الاحتراق الوظيفي", "ممرضات العناية المركزة"],
  ["رضا المرضى", "مرضى التنويم"],
  ["الإجهاد المهني", "الممرضات"],
];

/** «دوّري لنا أداة معتمدة» — يقترح استبيانات/مقاييس موثّقة لمتغير بحثكم مع ثباتها
    ولغاتها، مبنية على ملخصات دراسات حقيقية (كل أداة مربوطة بدراستها الأصلية) */
export default function ToolsFinder() {
  const { toolsForm, setToolsForm, toolsBusy: busy, toolsResult, toolsMessage: message, startTools: run } =
    useResearchAgentState();
  const tools = toolsResult?.tools ?? null;
  const caveat = toolsResult?.caveat ?? "";
  const { construct, population } = toolsForm;
  const setConstruct = (v: string) => setToolsForm({ ...toolsForm, construct: v });
  const setPopulation = (v: string) => setToolsForm({ ...toolsForm, population: v });

  return (
    <div className="space-y-4">
      <Card tone="cream">
        <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-brand-950">
          <Ruler size={18} className="text-brand-500" />
          دوّروا لنا أداة قياس معتمدة
        </h3>
        <p className="mb-4 text-xs text-brand-950/50">
          «الأداة» هي الاستبيان أو المقياس اللي تعبّئونه على المشاركين. بدل ما تصممون استبيان من الصفر (ويحتاج اختبار صدق
          وثبات)، الأفضل تستخدمون استبيان معتمد. اكتبوا الشي اللي تبون تقيسونه ونقترح لكم أدوات من دراسات حقيقية.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_auto]">
          <input
            value={construct}
            onChange={(e) => setConstruct(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="وش تبون تقيسون؟ مثل: الاحتراق الوظيفي"
            className="w-full rounded-lg border border-brand-100 px-3 py-2.5 text-sm outline-none focus:border-brand-300"
          />
          <input
            value={population}
            onChange={(e) => setPopulation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="على مين؟ (اختياري) مثل: ممرضات العناية المركزة"
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
        {!construct.trim() && !busy && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-brand-950/40">جرّبوا مثلًا:</span>
            {examples.map(([c, p]) => (
              <button
                key={c}
                onClick={() => setToolsForm({ construct: c, population: p })}
                className="rounded-full border border-brand-100 bg-paper px-3 py-1 text-xs text-brand-700 hover:bg-surface-muted"
              >
                {c} — {p}
              </button>
            ))}
          </div>
        )}
        {busy && (
          <p className="mt-3 flex items-center gap-2 text-xs text-brand-950/55" role="status">
            <Loader2 size={13} className="animate-spin" />
            نبحث عن دراسات تطوير وتحقق للمقاييس ونستخرج بيانات كل أداة — ياخذ غالبًا ١٥–٢٠ ثانية. تقدرون تتنقلون لقسم ثاني وننبّهكم لما يجهز.
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
          <p className="rounded-2xl bg-surface-muted px-4 py-3 text-xs leading-relaxed text-brand-950/60">
            <b className="text-brand-950/80">كيف تقرأون البطاقة؟ </b>
            «الفقرات» عدد أسئلة الأداة. «الثبات» يقيس إن الأداة تعطي نتائج متسقة — القيمة المقبولة عادةً ٠٫٧ فأكثر (Cronbach's α).
            وتأكدوا إن الأداة تنفع مع فئتكم ولغتكم، واطلبوا موافقة صاحب الأداة على استخدامها لو لزم.
          </p>
          <p className="text-xs text-brand-950/50">
            الأدوات اللي تحفظونها تنضاف لـ <Link to="/tools-library" className="font-bold text-brand-600 hover:underline">مكتبة أدوات القياس</Link> المشتركة.
          </p>
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
                      <p className="font-bold text-brand-950/40">{label === "الثبات" ? <Term id="reliability">الثبات</Term> : label}</p>
                      <p className="mt-0.5 text-brand-950/75">{value || "غير مذكور بالملخص"}</p>
                    </div>
                  ))}
                </div>
                {t.notes && <p className="text-xs text-brand-950/60">{t.notes}</p>}
                <SaveToLibrary tool={t} />
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
