import { useEffect, useRef, useState, type CSSProperties, type ChangeEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, ClipboardList, Copy, Eye, FileDown, FlaskConical, LineChart, MapPin, Ruler, ShieldCheck, Users2, Wand2 } from "lucide-react";
import AgentWave from "../components/ui/AgentWave";
import { EditorCard, SectionRail, WordsSaved } from "../components/v3/WriteKit";
import { useSupervisorFeedback } from "../hooks/useSupervisorFeedback";
import { openAgent, setAgentContext } from "../lib/agentBus";
import { useMethodology } from "../hooks/useMethodology";
import { useResearchProject } from "../hooks/useResearchProject";
import { methodologyTemplates, type MethodologyTemplate } from "../data/methodologyTemplates";
import type { Methodology as MethodologyData } from "../data/types";
import WriteHeader, { V3Glow } from "../components/v3/WriteHeader";
import { usePaperMode } from "../lib/paperMode";
import { useAuth } from "../context/AuthContext";
import { SavedTick } from "../components/v3/Motion";
import { METHOD_READY, type MethodPartKey } from "../lib/writeProgress";
import { isEn, tr } from "../lib/i18n";

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
    <label className="wf-fld !mt-0 block">
      <span className="wf-lbl flex flex-wrap items-center gap-x-2">
        <span>
          {label} {en && !isEn && <span className="font-normal" dir="ltr">· {en}</span>}
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
        className={rows > 1 ? "wf-ed sm !min-h-0" : "wf-fin resize-none"}
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
  const { items: feedback } = useSupervisorFeedback();
  const { project } = useResearchProject();
  const { currentUser } = useAuth();
  const [paper, setPaper] = usePaperMode(currentUser?.id);
  const [open, setOpen] = useState<PartKey | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const readyCount = PARTS.filter((p) => p.ready(m)).length;
  const openIdx = PARTS.findIndex((p) => p.key === open);
  const openPart = openIdx >= 0 ? PARTS[openIdx] : null;
  const currentTemplate = methodologyTemplates.find((t) => t.studyDesign === m.studyDesign)?.id ?? null;
  const previewT = methodologyTemplates.find((t) => t.id === preview) ?? null;


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
              <label className="wf-fld !mt-0 block">
                <span className="wf-lbl">
                  {tr("نوع الأداة")} {!isEn && <span className="font-normal">· Tool type</span>}
                </span>
                <select
                  value={m.studyTool.type}
                  onChange={(e) => updateMethodology({ studyTool: { ...m.studyTool, type: e.target.value as typeof m.studyTool.type } })}
                  className="wf-fin"
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
            <Link to="/ethical-approval" className="wf-gb self-start">
              <ShieldCheck size={15} />
              {tr("افتحوا الموافقة الأخلاقية")}
            </Link>
          </>
        );
    }
  };

  // القسم المفتوح: أول ما تفتح الصفحة = أول جزء ما جهز
  const active = openPart ?? PARTS.find((p) => !p.ready(m)) ?? PARTS[0];
  const activeIdx = PARTS.findIndex((p) => p.key === active.key);
  const nextPart = PARTS[activeIdx + 1];
  const activeLabel = bi(active.ar, active.en);
  useEffect(() => {
    setAgentContext(activeLabel);
    return () => setAgentContext(null);
  }, [activeLabel]);
  const partText = [active.summary(m), active.key === "sample" ? [...sampling.inclusionCriteria, ...sampling.exclusionCriteria].join(" ") : "", active.key === "collection" ? m.dataCollectionProcedure : ""].join(" ");
  const words = partText.trim() ? partText.trim().split(/\s+/).length : 0;
  const notes = feedback.filter((f) => f.status === "open" && f.sectionKey === "methodology");
  const type = project?.researchType ?? "";

  return (
    <div className="v3 relative">
      <V3Glow />
      <WriteHeader fallbackTitle={tr("المنهجية")} style={rise(0)} live={{ methodology: readyCount }} />

      <div className="relative grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[340px_minmax(0,1fr)]">
        <SectionRail
          title={tr("أقسام المنهجية")}
          items={PARTS.map((p) => ({ key: p.key, label: bi(p.ar, p.en), en: p.en, done: p.ready(m) }))}
          activeKey={active.key}
          onPick={(k) => setOpen(k as PartKey)}
          style={rise(1)}
          footer={
            <>
              <Link to="/proposal?section=methodology" className="wf-gb">
                <Eye size={16} aria-hidden />
                {tr("بالمقترح")}
              </Link>
              <button type="button" className="wf-gb" onClick={() => window.print()}>
                <FileDown size={16} aria-hidden />
                {tr("صدّر PDF")}
              </button>
            </>
          }
        />

        <div className="flex min-w-0 flex-col gap-[18px]">
          <EditorCard
            index={activeIdx + 1}
            total={PARTS.length}
            title={bi(active.ar, active.en)}
            en={active.en}
            paper={paper}
            onPaper={setPaper}
            hint={tipFor(active.key, type)}
            style={rise(2)}
            titleId="m-sec-title"
          >
            {/* التصميم: ابدأوا من قالب */}
            {active.key === "design" && (
              <div className="wf-fld !mt-0">
                <span className="wf-lbl">{tr("ابدأوا من قالب (اختياري)")}</span>
                <div className="flex flex-wrap gap-2">
                  {methodologyTemplates.map((t) => {
                    const on = preview === t.id || (!preview && currentTemplate === t.id);
                    return (
                      <button key={t.id} type="button" className="wf-opt" aria-pressed={on} onClick={() => setPreview(preview === t.id ? null : t.id)}>
                        <span className="wf-rd" aria-hidden />
                        {isEn ? t.label : TEMPLATE_AR[t.id] ?? t.label}
                      </button>
                    );
                  })}
                </div>
                {previewT && (
                  <div className="v3-g2 mt-3 grid gap-3 p-4 text-sm" dir="ltr" lang="en">
                    <p className="m-0 font-bold">{previewT.studyDesign}</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <ul className="m-0 list-disc ps-5 text-[var(--ws-c-text)]">
                        {previewT.inclusionCriteria.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                      <ul className="m-0 list-disc ps-5 text-[var(--ws-c-text)]">
                        {previewT.exclusionCriteria.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                    <p className="m-0 text-[var(--ws-c-text)]">
                      {previewT.samplingTechnique} · {previewT.dataCollectionMethods.join(", ")} · {previewT.suggestedTool}
                    </p>
                    <div className="flex flex-wrap gap-2" dir={isEn ? "ltr" : "rtl"}>
                      <button type="button" className="wf-gb" onClick={() => applyTemplate(previewT)}>
                        <Wand2 size={15} />
                        {tr("عبّوا المنهجية بهالقالب")}
                      </button>
                      <button type="button" className="wf-gb" onClick={() => copyTemplate(previewT)}>
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                        {copied ? tr("تم نسخ القالب") : tr("نسخ القالب")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div key={active.key} className="flex flex-col gap-3">
              {fields(active.key)}
            </div>

            <div className="ws-write-foot flex flex-wrap items-center gap-2.5">
              <WordsSaved words={words} />
              <span className="flex-1" />
              <button type="button" className="wf-gb" onClick={() => openAgent(tr("ساعدني أكتب جزء «{0}» في منهجية بحثنا", activeLabel))}>
                <AgentWave size={15} />
                {tr("اكتب لي مسودة")}
              </button>
              <button type="button" className="wf-gb" disabled={activeIdx <= 0} onClick={() => setOpen(PARTS[activeIdx - 1].key)}>
                {tr("السابق")}
              </button>
              {nextPart ? (
                <button type="button" className="wf-pr" onClick={() => setOpen(nextPart.key)}>
                  {tr("التالي ←")}
                </button>
              ) : (
                <Link to="/ethical-approval" className="wf-pr">
                  {tr("للموافقة الأخلاقية ←")}
                </Link>
              )}
            </div>
          </EditorCard>

          <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
            <section className="hg-card" style={rise(3)} aria-labelledby="m-link-title">
              <h3 id="m-link-title" className="m-0 text-[18px] font-extrabold">
                {tr("مربوطة بباقي البحث")}
              </h3>
              <div className="mt-0.5 text-[13px] text-[#ABA095]">{tr("المنهجية تنسحب للموافقة الأخلاقية، وملخصها ينكتب في قسم «المنهجية» بالمقترح.")}</div>
              <div className="mt-2.5">
                <div className="wf-kv">
                  <span>{tr("الأجزاء الجاهزة")}</span>
                  <b>
                    <span className="wf-num">
                      {readyCount}/{PARTS.length}
                    </span>
                  </b>
                </div>
                <div className="wf-kv">
                  <span>{tr("قسم المقترح")}</span>
                  <b>
                    <Link to="/proposal?section=methodology" className="text-[#FFC777]">
                      {tr("القسم")} <span className="wf-num">7</span> · {tr("المنهجية")}
                    </Link>
                  </b>
                </div>
                <div className="wf-kv">
                  <span>{tr("الموافقة الأخلاقية")}</span>
                  <b>
                    <Link to="/ethical-approval" className="text-[#FFC777]">
                      {tr("افتحوها")}
                    </Link>
                  </b>
                </div>
              </div>
            </section>

            <section className="hg-card" style={rise(4)} aria-labelledby="m-notes-title">
              <div className="flex items-center gap-2">
                <h3 id="m-notes-title" className="m-0 text-[18px] font-extrabold">
                  {tr("ملاحظات المشرف/ة")}
                </h3>
                {notes.length > 0 && (
                  <span className="wf-st now">
                    <span className="wf-num">{notes.length}</span> {tr("مفتوحة")}
                  </span>
                )}
              </div>
              {notes.length === 0 ? (
                <p className="m-0 mt-2 text-[14px] text-[#ABA095]">{tr("ما فيه ملاحظات مفتوحة على المنهجية.")}</p>
              ) : (
                <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
                  {notes.slice(0, 2).map((n) => (
                    <li key={n.id} className="wf-tpl block text-[14px] leading-[1.7]" dir="auto">
                      «{n.comment}»
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/feedback" className="wf-gb mt-3 w-full">
                {tr("افتحوا الملاحظات")}
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
