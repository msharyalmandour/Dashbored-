import { useEffect, useRef, useState, type CSSProperties, type ChangeEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, ClipboardList, Copy, FlaskConical, LineChart, MapPin, Ruler, ShieldCheck, Sparkles, Users2, Wand2, X } from "lucide-react";
import { useMethodology } from "../hooks/useMethodology";
import { useResearchProject } from "../hooks/useResearchProject";
import { methodologyTemplates, type MethodologyTemplate } from "../data/methodologyTemplates";
import type { Methodology as MethodologyData } from "../data/types";
import WriteHeader, { V3Glow, num } from "../components/v3/WriteHeader";
import PaperToggle from "../components/v3/PaperToggle";
import { usePaperMode } from "../lib/paperMode";
import { useAuth } from "../context/AuthContext";
import { SavedTick } from "../components/v3/Motion";
import { METHOD_READY, type MethodPartKey } from "../lib/writeProgress";
import { isEn, tr, trx } from "../lib/i18n";

/* المنهجية — ترتيب v3 (لوحة «أكتب — المنهجية»): قوالب فوق، خريطة ٧ أجزاء، وكل جزء يفتح لوحة جانبية
   فيها نفس الحقول السابقة. ترتيب واجهة بس: نفس الحقول، ونفس الحفظ عند الخروج من الحقل. */

const bi = (ar: string, en: string) => (isEn ? en : ar);

type PartKey = MethodPartKey;

const TEMPLATE_AR: Record<string, string> = {
  "cross-sectional": "مسحية مقطعية",
  "systematic-review": "مراجعة منهجية",
  qualitative: "دراسة نوعية",
  cohort: "دراسة أترابية",
};

/** حقل بسطر/أسطر يُحفظ عند الخروج منه — نفس سلوك الحقول السابقة */
function Field({ label, en, value, onSave, rows = 1, placeholder }: { label: string; en?: string; value: string; onSave: (v: string) => void; rows?: number; placeholder?: string }) {
  const [draft, setDraft] = useState(value);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (document.activeElement !== ref.current) setDraft(value);
  }, [value]);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex flex-wrap items-center gap-x-2 text-sm font-bold">
        <span>
          {label} {en && !isEn && <span className="v3-en font-normal">{en}</span>}
        </span>
        <SavedTick at={savedAt} />
      </span>
      <textarea
        ref={ref}
        dir="auto"
        rows={rows}
        value={draft}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== value) {
            onSave(draft);
            setSavedAt(Date.now());
          }
        }}
        placeholder={placeholder ?? tr("لم يُحدد بعد")}
        className={`v3-field !text-sm${draft.trim() ? "" : " v3-empty"}`}
      />
    </label>
  );
}

/** قائمة (سطر لكل عنصر) تُحفظ عند الخروج */
function ListField({ label, en, items, onSave }: { label: string; en?: string; items: string[]; onSave: (v: string[]) => void }) {
  const joined = items.join("\n");
  return (
    <Field
      label={label}
      en={en}
      value={joined}
      rows={3}
      placeholder={tr("سطر لكل معيار…")}
      onSave={(v) => {
        const next = v.split("\n").filter(Boolean);
        if (next.join("\n") !== joined) onSave(next);
      }}
    />
  );
}

interface Part {
  key: PartKey;
  ar: string;
  en: string;
  icon: ReactNode;
  summary: (m: MethodologyData) => string;
  ready: (m: MethodologyData) => boolean;
}

const PARTS: Part[] = [
  { key: "design", ar: "التصميم", en: "Study design", icon: <FlaskConical size={18} />, summary: (m) => m.studyDesign, ready: METHOD_READY.design },
  { key: "setting", ar: "مكان الدراسة", en: "Setting", icon: <MapPin size={18} />, summary: (m) => m.studySetting, ready: METHOD_READY.setting },
  { key: "population", ar: "مجتمع الدراسة", en: "Population", icon: <Users2 size={18} />, summary: (m) => m.population, ready: METHOD_READY.population },
  {
    key: "sample",
    ar: "العينة",
    en: "Sample",
    icon: <Ruler size={18} />,
    summary: (m) => [m.sampling.sampleSize, m.sampling.samplingTechnique].filter((x) => x.trim()).join(" · "),
    ready: METHOD_READY.sample,
  },
  {
    key: "collection",
    ar: "جمع البيانات",
    en: "Data collection",
    icon: <ClipboardList size={18} />,
    summary: (m) => [m.dataCollectionMethods.join("، "), m.studyTool.name].filter((x) => x.trim()).join(" · "),
    ready: METHOD_READY.collection,
  },
  { key: "analysis", ar: "التحليل", en: "Data analysis", icon: <LineChart size={18} />, summary: (m) => m.dataAnalysis, ready: METHOD_READY.analysis },
  { key: "ethics", ar: "الاعتبارات الأخلاقية", en: "Ethical considerations", icon: <ShieldCheck size={18} />, summary: (m) => m.ethicalConsiderations, ready: METHOD_READY.ethics },
];

/** نصيحة ثابتة لكل جزء، تتغيّر حسب نوع البحث */
function tipFor(key: PartKey, type: string): string {
  const qual = type === "qualitative";
  const quant = type === "quantitative";
  switch (key) {
    case "design":
      return tr("اختاروا تصميم يجاوب أسئلة البحث: «كيف يعيشون أو يصفون…» تناسب النوعي، و«كم» أو «هل فيه علاقة» تناسب الكمّي.");
    case "setting":
      return tr("اذكروا اسم المكان والقسم والمدة، مثل: «وحدة العناية المركزة في مستشفى … خلال الفصل الأول».");
    case "population":
      return tr("حددوا الفئة بدقة: مين، ووين، ووش يميّزهم. العينة تنسحب من هالمجتمع.");
    case "sample":
      return qual
        ? tr("بما إن دراستكم نوعية، العينة الهادفة وحجم ١٢–١٥ مشارك حتى التشبّع هو المعتاد. راجعوه مع المشرف/ة.")
        : quant
          ? tr("احسبوا حجم العينة من مجتمع الدراسة (مثل معادلة Yamane أو G*Power)، واكتبوا الطريقة اللي استخدمتوها.")
          : tr("حجم العينة وطريقة اختيارها يعتمدون على نوع البحث. حددوا النوع من «معلومات البحث» بالمقترح.");
    case "collection":
      return tr("اكتبوا طريقة الجمع وخطوات تطبيقها: مين يجمع، ومتى، وكم ياخذ — وأداة الدراسة جاهزة ولا مطوّرة.");
    case "analysis":
      return qual
        ? tr("التحليل الموضوعي (Braun & Clarke) هو الأشهر للدراسات النوعية.")
        : tr("حددوا البرنامج (مثل SPSS) والاختبارات حسب نوع المتغيرات. استوديو الإحصاء يساعدكم تختارون.");
    case "ethics":
      return tr("هذا الجزء مربوط بالموافقة الأخلاقية: الموافقة المستنيرة، والسرية، وحق الانسحاب.");
  }
}

export default function Methodology() {
  const { methodology: m, updateMethodology } = useMethodology();
  const { project } = useResearchProject();
  const { currentUser } = useAuth();
  const [paper, setPaper] = usePaperMode(currentUser?.id);
  const [open, setOpen] = useState<PartKey | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const readyCount = PARTS.filter((p) => p.ready(m)).length;
  const pct = Math.round((readyCount / PARTS.length) * 100);
  const openIdx = PARTS.findIndex((p) => p.key === open);
  const openPart = openIdx >= 0 ? PARTS[openIdx] : null;
  const currentTemplate = methodologyTemplates.find((t) => t.studyDesign === m.studyDesign)?.id ?? null;
  const previewT = methodologyTemplates.find((t) => t.id === preview) ?? null;

  useEffect(() => {
    if (!open) return;
    drawerRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const applyTemplate = (t: MethodologyTemplate) => {
    updateMethodology({
      studyDesign: t.studyDesign,
      studyDesignStatus: "in-progress",
      sampling: {
        inclusionCriteria: t.inclusionCriteria,
        exclusionCriteria: t.exclusionCriteria,
        samplingTechnique: t.samplingTechnique,
        sampleSize: m.sampling.sampleSize,
      },
      dataCollectionMethods: t.dataCollectionMethods,
      studyTool: { type: "existing", name: t.suggestedTool },
    });
    setPreview(null);
  };

  const copyTemplate = async (t: MethodologyTemplate) => {
    const text = [t.studyDesign, "", ...t.inclusionCriteria.map((c) => `+ ${c}`), ...t.exclusionCriteria.map((c) => `- ${c}`), "", t.samplingTechnique, ...t.dataCollectionMethods, t.suggestedTool].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // نسخ يدوي لو الحافظة غير متاحة
    }
  };

  const rise = (i: number) => ({ ["--v3-i" as string]: i }) as CSSProperties;
  const sampling = m.sampling;

  const fields = (key: PartKey) => {
    switch (key) {
      case "design":
        return <Field label={tr("نوع التصميم")} en="Study design" value={m.studyDesign} rows={2} onSave={(v) => updateMethodology({ studyDesign: v })} />;
      case "setting":
        return <Field label={tr("المكان")} en="Setting" value={m.studySetting} rows={2} onSave={(v) => updateMethodology({ studySetting: v })} />;
      case "population":
        return <Field label={tr("الفئة المستهدفة")} en="Population" value={m.population} rows={2} onSave={(v) => updateMethodology({ population: v })} />;
      case "sample":
        return (
          <>
            <ListField label={tr("معايير الإدراج")} en="Inclusion" items={sampling.inclusionCriteria} onSave={(v) => updateMethodology({ sampling: { ...sampling, inclusionCriteria: v } })} />
            <ListField label={tr("معايير الاستبعاد")} en="Exclusion" items={sampling.exclusionCriteria} onSave={(v) => updateMethodology({ sampling: { ...sampling, exclusionCriteria: v } })} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={tr("حجم العينة")} en="Sample size" value={sampling.sampleSize} onSave={(v) => updateMethodology({ sampling: { ...sampling, sampleSize: v } })} />
              <Field label={tr("طريقة الاختيار")} en="Sampling technique" value={sampling.samplingTechnique} onSave={(v) => updateMethodology({ sampling: { ...sampling, samplingTechnique: v } })} />
            </div>
          </>
        );
      case "collection":
        return (
          <>
            <ListField label={tr("طريقة الجمع")} en="Methods" items={m.dataCollectionMethods} onSave={(v) => updateMethodology({ dataCollectionMethods: v })} />
            <Field label={tr("إجراء جمع البيانات")} en="Procedure" value={m.dataCollectionProcedure} rows={3} onSave={(v) => updateMethodology({ dataCollectionProcedure: v })} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold">
                  {tr("نوع الأداة")} {!isEn && <span className="v3-en font-normal">Tool type</span>}
                </span>
                <select
                  value={m.studyTool.type}
                  onChange={(e) => updateMethodology({ studyTool: { ...m.studyTool, type: e.target.value as typeof m.studyTool.type } })}
                  className="v3-select"
                >
                  <option value="undecided">{tr("لم يُحدد بعد")}</option>
                  <option value="existing">{tr("أداة جاهزة")}</option>
                  <option value="developed">{tr("أداة مطوَّرة")}</option>
                </select>
              </label>
              <Field label={tr("اسم الأداة")} en="Tool name" value={m.studyTool.name} onSave={(v) => updateMethodology({ studyTool: { ...m.studyTool, name: v } })} />
            </div>
          </>
        );
      case "analysis":
        return <Field label={tr("طريقة التحليل")} en="Data analysis" value={m.dataAnalysis} rows={3} onSave={(v) => updateMethodology({ dataAnalysis: v })} />;
      case "ethics":
        return (
          <>
            <Field label={tr("الموافقات الأخلاقية والموافقة المستنيرة")} en="Ethical considerations" value={m.ethicalConsiderations} rows={4} onSave={(v) => updateMethodology({ ethicalConsiderations: v })} />
            <Link to="/ethical-approval" className="v3-bd !text-sm">
              <ShieldCheck size={15} />
              {tr("افتحوا الموافقة الأخلاقية")}
            </Link>
          </>
        );
    }
  };

  return (
    <div className="v3 relative">
      <V3Glow />
      <WriteHeader fallbackTitle={tr("المنهجية")} style={rise(0)} live={{ methodology: readyCount }} />
      <div className="relative -mt-2 mb-3 flex justify-end">
        <PaperToggle on={paper} onChange={setPaper} />
      </div>

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
          {/* ابدأوا من قالب */}
          <div className="v3-g v3-rise p-5 sm:px-[22px]" style={rise(1)}>
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[14px]" style={{ background: "linear-gradient(135deg,#FF7A10,#FFC85A)", color: "#1A0802" }}>
                <Wand2 size={20} />
              </span>
              <div className="min-w-[200px] flex-1">
                <div className="v3-k text-lg">{tr("ابدأوا من قالب")}</div>
                <div className="v3-mut text-sm">{tr("اختاروا أقرب نوع لدراستكم ونعبّي لكم هيكل مبدئي تعدّلونه.")}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {methodologyTemplates.map((t) => {
                  const on = preview === t.id || (!preview && currentTemplate === t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={preview === t.id}
                      onClick={() => setPreview(preview === t.id ? null : t.id)}
                      className="v3-tap min-h-[44px] rounded-full px-4 text-sm"
                      style={on ? { background: "#F6F1EC", color: "#160904", fontWeight: 700 } : { background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", color: "#E9DED3" }}
                    >
                      {isEn ? t.label : TEMPLATE_AR[t.id] ?? t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {previewT && (
              <div className="v3-g2 mt-4 grid gap-3 p-4 text-sm" dir="ltr" lang="en">
                <p className="m-0 font-bold">{previewT.studyDesign}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ul className="m-0 list-disc ps-5 text-[#CFC6BE]">
                    {previewT.inclusionCriteria.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                  <ul className="m-0 list-disc ps-5 text-[#CFC6BE]">
                    {previewT.exclusionCriteria.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
                <p className="m-0 text-[#CFC6BE]">
                  {previewT.samplingTechnique} · {previewT.dataCollectionMethods.join(", ")} · {previewT.suggestedTool}
                </p>
                <div className="flex flex-wrap gap-2" dir={isEn ? "ltr" : "rtl"}>
                  <button type="button" className="v3-bw !text-sm" onClick={() => applyTemplate(previewT)}>
                    <Wand2 size={15} />
                    {tr("عبّوا المنهجية بهالقالب")}
                  </button>
                  <button type="button" className="v3-bd !text-sm" onClick={() => copyTemplate(previewT)}>
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? tr("تم نسخ القالب") : tr("نسخ القالب")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* خريطة المنهجية */}
          <div className="v3-rise flex flex-wrap items-end justify-between gap-3" style={rise(2)}>
            <div>
              <h2 className="v3-k m-0 text-xl">{tr("خريطة المنهجية")}</h2>
              <p className="v3-mut m-0 text-sm">{trx("{0} أجزاء — {1} جاهزة. اضغطوا أي جزء يفتح على الجنب.", num(PARTS.length), num(readyCount))}</p>
            </div>
            <div className="flex w-full items-center gap-2.5 sm:w-[260px]">
              <div className="v3-bar flex-1" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <i style={{ width: `${pct}%` }} />
              </div>
              <span className="v3-k text-[15px]">{num(pct)}٪</span>
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-3.5 sm:grid-cols-2 ${open ? "xl:grid-cols-2 2xl:grid-cols-3" : "xl:grid-cols-3"}`}>
            {PARTS.map((p, i) => {
              const ready = p.ready(m);
              const isOpen = open === p.key;
              const summary = p.summary(m).trim();
              const ethics = p.key === "ethics";
              const chip = isOpen ? ["doing", tr("تعدّلونه الحين")] : ready ? ["done", tr("جاهز")] : ethics ? ["doing", tr("مربوط")] : ["todo", tr("ما تحدد")];
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setOpen(isOpen ? null : p.key)}
                  aria-expanded={isOpen}
                  className={`v3-g v3-hover v3-rise v3-tap flex min-h-[44px] gap-2.5 rounded-3xl p-[18px] text-start ${ethics ? "flex-row flex-wrap items-center sm:col-span-full" : "flex-col"} ${isOpen ? "v3-sheen v3-glow" : ""}`}
                  style={{
                    ...rise(3 + i),
                    ...(isOpen ? { borderColor: "rgba(255,180,68,.55)", background: "linear-gradient(180deg,rgba(255,150,40,.16),rgba(255,255,255,.03)),rgba(14,10,8,.72)" } : {}),
                  }}
                >
                  <span className={`flex items-center justify-between gap-3 ${ethics ? "" : "w-full"}`}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-[13px]" style={{ background: "rgba(255,140,40,.14)", color: "#FFB444" }}>
                      {p.icon}
                    </span>
                    {!ethics && <span className={`v3-st ${chip[0]}`}>{chip[1]}</span>}
                  </span>
                  <span className={ethics ? "min-w-[160px]" : ""}>
                    <span className="v3-k block text-[17px]">{bi(p.ar, p.en)}</span>
                    {!isEn && <span className="v3-en block">{p.en}</span>}
                  </span>
                  <span className={`line-clamp-2 text-sm ${ethics ? "min-w-[180px] flex-1" : ""}`} dir="auto" style={{ color: summary ? "#E9DED3" : "#776C63" }}>
                    {summary || (ethics ? tr("تُسحب من الموافقة الأخلاقية") : tr("اضغطوا وحددوه"))}
                  </span>
                  {ethics && <span className={`v3-st ${chip[0]}`}>{chip[1]}</span>}
                </button>
              );
            })}
          </div>
          <p className="v3-mut m-0 flex items-center gap-2 text-[13px]">
            <Check size={14} color="#7FE0A6" />
            {tr("كل تعديل ينحفظ لما تطلعون من الحقل ويظهر للفريق كامل.")}
          </p>
        </div>

        {/* اللوحة الجانبية: جوال = ورقة من تحت، كمبيوتر = عمود جنب الخريطة */}
        {openPart && (
          <>
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(null)} aria-hidden />
            <div
              ref={drawerRef}
              tabIndex={-1}
              role="dialog"
              aria-labelledby="v3-drawer-title"
              key={openPart.key}
              className={`v3-g ws-write${paper ? " is-paper" : ""} fixed inset-x-0 bottom-0 z-[61] flex max-h-[88vh] flex-col gap-4 overflow-y-auto rounded-b-none p-[22px] pb-[calc(22px+env(safe-area-inset-bottom))] outline-none lg:pb-[22px] lg:sticky lg:top-4 lg:z-auto lg:max-h-[calc(100vh-2rem)] lg:w-[390px] lg:shrink-0 lg:rounded-b-[28px]`}
              style={{ borderColor: "rgba(255,180,68,.35)", background: "linear-gradient(180deg,rgba(40,16,8,.92),rgba(20,8,4,.92))" }}
            >
              <div className="ws-paper-layer" aria-hidden />
              <div className="ws-paper-margin" aria-hidden />
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-[13px]" style={{ background: "rgba(255,140,40,.14)", color: "#FFB444" }}>
                  {openPart.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 id="v3-drawer-title" className="v3-k m-0 text-xl">
                    {bi(openPart.ar, openPart.en)}
                  </h3>
                  {!isEn && <div className="v3-en">{openPart.en}</div>}
                </div>
                <button type="button" className="v3-bd !min-w-[44px] !px-0" onClick={() => setOpen(null)} aria-label={tr("إغلاق")}>
                  <X size={18} />
                </button>
              </div>

              {fields(openPart.key)}

              <div className="v3-g2 flex gap-2 px-3.5 py-3 text-[13px] leading-relaxed" style={{ borderColor: "rgba(255,180,68,.25)" }}>
                <Sparkles size={15} color="#FFB444" className="mt-1 shrink-0" />
                <span>{tipFor(openPart.key, project?.researchType ?? "")}</span>
              </div>

              <div className="mt-auto flex gap-2">
                <button type="button" className="v3-bd flex-1" disabled={openIdx <= 0} onClick={() => setOpen(PARTS[openIdx - 1].key)}>
                  {tr("السابق")}
                </button>
                <button type="button" className="v3-bw flex-1" onClick={() => setOpen(openIdx < PARTS.length - 1 ? PARTS[openIdx + 1].key : null)}>
                  {openIdx < PARTS.length - 1 ? tr("التالي ←") : tr("تم")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
