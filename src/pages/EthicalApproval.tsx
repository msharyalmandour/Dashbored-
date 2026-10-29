import { useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent } from "react";
import { Check, ExternalLink, FileCheck2, Loader2, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
import FileAttach from "../components/FileAttach";
import WriteHeader, { V3Glow, num } from "../components/v3/WriteHeader";
import PaperToggle from "../components/v3/PaperToggle";
import { usePaperMode } from "../lib/paperMode";
import { useAuth } from "../context/AuthContext";
import { SavedTick } from "../components/v3/Motion";
import { useEthicalApproval } from "../hooks/useEthicalApproval";
import { useResearchProject } from "../hooks/useResearchProject";
import { useProposal } from "../hooks/useProposal";
import { useMethodology } from "../hooks/useMethodology";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { buildEthicalApprovalDoc } from "../lib/ethicalApprovalExport";
import { downloadWordDoc } from "../lib/wordExport";
import { PRINCIPLE_KEYS, ethicsStepsDone, principlesAnswered } from "../lib/writeProgress";
import type { EthicalAttachments, EthicalApproval, EthicalPrincipleAnswer, EthicalPrinciples, PiType } from "../data/types";
import { isEn, tr, trx } from "../lib/i18n";

/* الموافقة الأخلاقية — ترتيب v3 (لوحة «أكتب — الموافقة الأخلاقية»): بطاقة الطلب، شريط ٤ خطوات، قسم واحد بكل مرة،
   والمبادئ الـ١٣ بمجموعات. ترتيب واجهة بس: نفس الحقول ونفس الحفظ ونفس تصدير Word. */

/** حقل يُحفظ عند الخروج منه فقط — نفس السلوك السابق */
function Field({
  label,
  en,
  value,
  onSave,
  type = "text",
  rows,
  placeholder,
}: {
  label: string;
  en?: string;
  value: string;
  onSave: (next: string) => void;
  type?: "text" | "date" | "email";
  rows?: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  useEffect(() => {
    if (document.activeElement !== ref.current) setDraft(value);
  }, [value]);
  const common = {
    ref,
    value: draft,
    dir: type === "text" ? ("auto" as const) : ("ltr" as const),
    placeholder,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: () => {
      if (draft !== value) {
        onSave(draft);
        setSavedAt(Date.now());
      }
    },
  };
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex flex-wrap items-center gap-x-2 text-sm font-bold">
        <span>
          {label} {en && !isEn && <span className="v3-en font-normal">{en}</span>}
        </span>
        <SavedTick at={savedAt} />
      </span>
      {rows ? (
        <textarea {...common} rows={rows} className={`v3-field !text-sm${draft.trim() ? "" : " v3-empty"}`} />
      ) : (
        <input {...common} type={type} className="v3-select w-full" style={{ colorScheme: "dark" }} />
      )}
    </label>
  );
}

const QUESTION: Record<keyof EthicalPrinciples, string> = {
  writtenExplanation: "هل سيُقدَّم للمشاركين شرح مكتوب عن البحث؟",
  oralExplanation: "هل سيُقدَّم للمشاركين شرح شفهي عن البحث؟",
  writtenConsent: "هل سيوقّع المشاركون على نموذج موافقة؟",
  oralConsent: "هل ستُؤخذ موافقة شفهية من المشاركين؟",
  voluntaryInformed: "هل سيُخبَر المشاركون أن المشاركة اختيارية؟",
  withdrawOption: "هل ستُتاح للمشاركين فرصة الانسحاب بأي مرحلة دون إبداء سبب؟",
  harmInformed: "هل سيُخبَر المشاركون بأي ضرر محتمل من المشاركة؟",
  confidentialityGuaranteed: "هل ستُضمَن سرية بيانات المشاركين؟",
  anonymityGuaranteed: "هل ستُضمَن إخفاء هوية المشاركين؟",
  vulnerableGroupsInformed: "لو شمل البحث فئات مستضعفة (أطفال دون ١٨، كبار السن، ...) — هل سيُخبَرون أنهم يقدرون يتجاوزون أي سؤال ما يرغبون بالإجابة عليه؟",
  interviewNoExplanationNeeded: "لو تضمّن البحث مقابلات — هل سيُخبَر المشاركون أنهم غير مُلزَمين بالإجابة على أي سؤال بدون تفسير؟",
  safeDataStorage: "هل تم تأمين تخزين آمن للبيانات؟",
  willPublish: "هل سينشر الباحث/ون نتائج البحث؟",
};

/** المجموعات بنفس ترتيب النموذج الرسمي (الترقيم ١–١٣ يبقى ثابت) */
const GROUPS: { id: string; ar: string; en: string; keys: (keyof EthicalPrinciples)[] }[] = [
  { id: "consent", ar: "الموافقة المستنيرة", en: "Informed consent", keys: PRINCIPLE_KEYS.slice(0, 7) },
  { id: "privacy", ar: "الخصوصية", en: "Privacy", keys: PRINCIPLE_KEYS.slice(7, 9) },
  { id: "vulnerable", ar: "الفئات المستضعفة", en: "Vulnerable groups", keys: PRINCIPLE_KEYS.slice(9, 11) },
  { id: "data", ar: "البيانات والنشر", en: "Data & publishing", keys: PRINCIPLE_KEYS.slice(11, 13) },
];

const ANSWERS: { v: Exclude<EthicalPrincipleAnswer, null>; label: string; on: CSSProperties }[] = [
  { v: "yes", label: "نعم", on: { background: "#7FE0A6", color: "#160904" } },
  { v: "no", label: "لا", on: { background: "#FF8A7A", color: "#160904" } },
  { v: "na", label: "لا ينطبق", on: { background: "rgba(255,255,255,.22)", color: "#F6F1EC" } },
];

const attachmentItems: { key: keyof EthicalAttachments; label: string; to: string }[] = [
  { key: "protocolOrProposal", label: "المقترح البحثي (Protocol)", to: "/proposal" },
  { key: "participantInfoSheet", label: "ورقة معلومات المشارك", to: "/files" },
  { key: "consentForm", label: "نموذج الموافقة (Consent Form)", to: "/files" },
  { key: "studyTools", label: "أداة الدراسة", to: "/methodology" },
  { key: "otherSupportiveDocs", label: "مستندات داعمة أخرى", to: "/files" },
];

const outcomeLabel: Record<string, string> = {
  pending: "بانتظار الرد",
  granted: "تمت الموافقة",
  amendments: "مطلوب تعديلات",
  rejected: "مرفوض",
};

type StepId = 1 | 2 | 3 | 4;
/** تسلسل التنقل: الخطوة ٣ تمشي على مجموعات المبادئ وحدة وحدة */
type Stop = { step: StepId; group?: number };
const STOPS: Stop[] = [{ step: 1 }, { step: 2 }, ...GROUPS.map((_, g) => ({ step: 3 as StepId, group: g })), { step: 4 }];

const filled = (v: string | null | undefined) => !!v && !!String(v).trim();
const STEP1: (keyof EthicalApproval)[] = ["applicationDate", "expectedStartDate", "expectedEndDate", "dataManagementConfidentiality", "fundingDetails"];
const STEP2: (keyof EthicalApproval)[] = ["piName", "piAffiliation", "piEmail", "piType", "otherResearchers", "supervisorNames", "registrationNo", "personsInvolved"];

export default function EthicalApprovalPage() {
  const { ethicalApproval: ea, updateEthicalApproval } = useEthicalApproval();
  const { project } = useResearchProject();
  const { currentUser } = useAuth();
  const [paper, setPaper] = usePaperMode(currentUser?.id);
  const { aim } = useProposal();
  const { methodology } = useMethodology();
  const { roster } = useTeamRoster();
  const [exporting, setExporting] = useState(false);

  const s1 = STEP1.filter((k) => filled(ea[k] as string | null)).length;
  const s2 = STEP2.filter((k) => filled(ea[k] as string | null)).length;
  const s3 = principlesAnswered(ea.principles);
  const s4 = attachmentItems.filter((a) => ea.attachments[a.key]).length;
  const stepDone = useMemo(() => ethicsStepsDone(ea), [ea]);
  const steps = useMemo(
    () => [
      { id: 1 as StepId, ar: "بيانات المشروع", en: "Project data", sub: trx("تنسحب لحالها · {0} من {1}", num(s1), num(STEP1.length)), done: stepDone[0], started: s1 > 0 },
      { id: 2 as StepId, ar: "الباحث والفريق", en: "Researcher & team", sub: trx("{0} من {1} حقول", num(s2), num(STEP2.length)), done: stepDone[1], started: s2 > 1 },
      { id: 3 as StepId, ar: "المبادئ الأخلاقية", en: "Ethical principles", sub: trx("{0} من {1} سؤال", num(s3), num(PRINCIPLE_KEYS.length)), done: stepDone[2], started: s3 > 0 },
      { id: 4 as StepId, ar: "المراجعة والتصدير", en: "Review & export", sub: tr("نموذج Word الرسمي"), done: stepDone[3], started: s4 > 0 },
    ],
    [ea, s1, s2, s3, s4, stepDone],
  );

  // أول ما توصل البيانات: نفتح أول خطوة ما خلصت
  const [stopIdx, setStopIdx] = useState<number | null>(null);
  useEffect(() => {
    if (stopIdx !== null || !ea.updatedAt) return;
    const first = steps.find((s) => !s.done)?.id ?? 4;
    setStopIdx(STOPS.findIndex((s) => s.step === first));
  }, [steps, stopIdx, ea.updatedAt]);
  const idx = stopIdx ?? 0;
  const stop = STOPS[idx];
  const goStep = (step: StepId) => setStopIdx(STOPS.findIndex((s) => s.step === step));

  const stopLabel = (s: Stop) => (s.step === 3 && s.group !== undefined ? (isEn ? GROUPS[s.group].en : GROUPS[s.group].ar) : isEn ? steps[s.step - 1].en : steps[s.step - 1].ar);

  const autoFillFromTeam = () => {
    const leader = roster.find((m) => m.role === "leader");
    const others = roster
      .filter((m) => m.id !== leader?.id)
      .map((m) => `${m.name} — ${m.title} — ${m.email}`)
      .join("\n");
    updateEthicalApproval({ piName: leader?.name ?? "", piEmail: leader?.email ?? "", otherResearchers: others });
  };

  const exportWord = async (style: "dark" | "official") => {
    setExporting(true);
    try {
      const blob = await buildEthicalApprovalDoc(
        { projectTitle: project?.title ?? "", aim: aim.statement, design: methodology.studyDesign, setting: methodology.studySetting, ethicalApproval: ea },
        style,
      );
      downloadWordDoc(blob, style === "dark" ? tr("طلب-الموافقة-الأخلاقية — Wesync.docx") : tr("طلب-الموافقة-الأخلاقية.docx"));
    } finally {
      setExporting(false);
    }
  };

  const rise = (i: number) => ({ ["--v3-i" as string]: i }) as CSSProperties;
  const pct = Math.round((s3 / PRINCIPLE_KEYS.length) * 100);

  const pulled = [
    { label: tr("عنوان الدراسة"), value: project?.title ?? "", to: null as string | null, where: "" },
    { label: tr("الهدف"), value: aim.statement, to: "/proposal", where: tr("عدّل في المقترح ←") },
    { label: tr("التصميم"), value: methodology.studyDesign, to: "/methodology", where: tr("عدّل في المنهجية ←") },
    { label: tr("مكان الدراسة"), value: methodology.studySetting, to: "/methodology", where: tr("عدّل في المنهجية ←") },
  ];

  return (
    <div className="v3 relative">
      <V3Glow />
      <WriteHeader fallbackTitle={tr("الموافقة الأخلاقية")} style={rise(0)} live={{ ethics: s3 }} />
      <div className="relative -mt-2 mb-3 flex justify-end">
        <PaperToggle on={paper} onChange={setPaper} />
      </div>

      {/* بطاقة الطلب */}
      <div className="v3-g v3-rise relative mb-4 flex flex-wrap items-center gap-4 p-5 sm:px-6" style={rise(1)}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px]" style={{ background: "linear-gradient(135deg,#FF7A10,#FFC85A)", color: "#1A0802" }}>
          <FileCheck2 size={22} />
        </span>
        <div className="min-w-[220px] flex-1">
          <div className="v3-k text-xl">
            {tr("طلب الموافقة الأخلاقية")} {!isEn && <span className="v3-en font-normal">Ethical Approval</span>}
          </div>
          <div className="v3-mut text-sm">{tr("مطلوب رسميًا مع المقترح، وبنفس تاريخ تسليمه.")}</div>
        </div>
        <button type="button" className="v3-bd" onClick={autoFillFromTeam}>
          <Wand2 size={16} />
          {tr("عبّوه تلقائيًا من الفريق")}
        </button>
        <button type="button" className="v3-bd" onClick={() => exportWord("official")} disabled={exporting} title={tr("نسق KAU الرسمي (أبيض) — هذا اللي يُقدَّم للجنة")}>
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileCheck2 size={16} />}
          {tr("النموذج الرسمي (Word)")}
        </button>
      </div>

      {/* شريط الخطوات الأربع */}
      <nav aria-label={tr("خطوات الطلب")} className="v3-g v3-rise v3-scroll-x relative mb-4 flex items-center gap-2 px-4 py-3 sm:px-6" style={rise(2)}>
        {steps.map((s, i) => {
          const current = stop.step === s.id;
          const circle: CSSProperties = s.done
            ? { background: "#7FE0A6", color: "#0b2015" }
            : current
              ? { background: "#F6F1EC", color: "#160904", boxShadow: "0 0 0 6px rgba(255,180,68,.2)" }
              : s.started
                ? { border: "1.5px solid rgba(255,255,255,.45)", color: "var(--ws-c-text)" }
                : { border: "1.5px solid rgba(255,255,255,.25)", color: "var(--ws-c-muted)" };
          return (
            <div key={s.id} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => goStep(s.id)}
                aria-current={current ? "step" : undefined}
                className="v3-tap flex min-h-[44px] shrink-0 items-center gap-3 rounded-2xl px-1.5 text-start"
              >
                <span className={`v3-k flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[15px]${current && !s.done ? " v3-glow" : ""}`} style={circle}>
                  {s.done ? <Check size={16} /> : num(s.id)}
                </span>
                <span className="leading-tight">
                  <span className="block whitespace-nowrap text-[15px] font-bold">{isEn ? s.en : s.ar}</span>
                  <span className="v3-mut block whitespace-nowrap text-xs">{s.sub}</span>
                </span>
              </button>
              {i < steps.length - 1 && <span aria-hidden className="h-0.5 min-w-[24px] flex-1 rounded-full" style={{ background: "rgba(255,255,255,.12)" }} />}
            </div>
          );
        })}
      </nav>

      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start">
        {/* القسم الحالي */}
        <section className={`v3-g v3-rise ws-write min-w-0 flex-1 p-5 sm:px-6 sm:py-[22px]${paper ? " is-paper" : ""}`} style={rise(3)} aria-labelledby="v3-step-title">
          <div className="ws-paper-layer" aria-hidden />
          <div className="ws-paper-margin" aria-hidden />
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="v3-eye">{trx("الخطوة {0} من {1}", num(stop.step), num(4))}</div>
              <h2 id="v3-step-title" className="v3-k m-0 text-[22px]">
                {isEn ? steps[stop.step - 1].en : steps[stop.step - 1].ar}
              </h2>
              {!isEn && stop.step === 3 && <div className="v3-en">Section Two — Ethical Principles</div>}
            </div>
            {stop.step === 3 && (
              <div className="flex items-center gap-2.5">
                <div className="v3-ring h-12 w-12" style={{ ["--v3-target" as string]: `${pct}%`, background: "conic-gradient(#7FE0A6 0 var(--v3p),rgba(255,255,255,.1) 0)" }} aria-hidden />
                <div className="v3-mut text-[13px]">{trx("{0} من {1}", num(s3), num(PRINCIPLE_KEYS.length))}</div>
              </div>
            )}
          </div>

          <div key={`${stop.step}-${stop.group ?? ""}`} className="flex flex-col gap-3.5">
            {stop.step === 1 && (
              <>
                <p className="v3-mut m-0 text-sm">{tr("العنوان والهدف والتصميم والمكان تنسحب لحالها من المقترح والمنهجية (على الجنب). هنا بس التواريخ والتمويل وإدارة البيانات.")}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label={tr("تاريخ تقديم الطلب")} type="date" value={ea.applicationDate ?? ""} onSave={(v) => updateEthicalApproval({ applicationDate: v || null })} />
                  <Field label={tr("تاريخ البدء المتوقع")} type="date" value={ea.expectedStartDate ?? ""} onSave={(v) => updateEthicalApproval({ expectedStartDate: v || null })} />
                  <Field label={tr("تاريخ الانتهاء المتوقع")} type="date" value={ea.expectedEndDate ?? ""} onSave={(v) => updateEthicalApproval({ expectedEndDate: v || null })} />
                </div>
                <Field label={tr("كيف ستُدار البيانات وتُحفظ سريتها")} en="Data management" rows={3} value={ea.dataManagementConfidentiality} onSave={(v) => updateEthicalApproval({ dataManagementConfidentiality: v })} />
                <Field label={tr("تفاصيل أي تمويل أو دعم مالي (إن وجد)")} en="Funding" rows={2} value={ea.fundingDetails} onSave={(v) => updateEthicalApproval({ fundingDetails: v })} />
              </>
            )}

            {stop.step === 2 && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={tr("اسم الباحث الرئيسي")} en="PI name" value={ea.piName} onSave={(v) => updateEthicalApproval({ piName: v })} />
                  <Field label={tr("الجهة")} en="Affiliation" value={ea.piAffiliation} onSave={(v) => updateEthicalApproval({ piAffiliation: v })} />
                  <Field label={tr("البريد الإلكتروني")} en="Email" type="email" value={ea.piEmail} onSave={(v) => updateEthicalApproval({ piEmail: v })} />
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">
                      {tr("نوع الباحث الرئيسي")} {!isEn && <span className="v3-en font-normal">PI type</span>}
                    </span>
                    <select value={ea.piType} onChange={(e) => updateEthicalApproval({ piType: e.target.value as PiType })} className="v3-select">
                      <option value="undergraduate">{tr("طالب/ة بكالوريوس")}</option>
                      <option value="graduate">{tr("طالب/ة دراسات عليا")}</option>
                      <option value="faculty">{tr("عضو هيئة تدريس")}</option>
                    </select>
                  </label>
                </div>
                <Field label={tr("باحثون آخرون — سطر لكل باحث: الاسم — الجهة — البريد")} en="Other researchers" rows={3} value={ea.otherResearchers} onSave={(v) => updateEthicalApproval({ otherResearchers: v })} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={tr("اسم/أسماء المشرف الأكاديمي")} en="Supervisor(s)" value={ea.supervisorNames} onSave={(v) => updateEthicalApproval({ supervisorNames: v })} />
                  <Field label={tr("الرقم الجامعي (إن وجد)")} en="Registration no." value={ea.registrationNo} onSave={(v) => updateEthicalApproval({ registrationNo: v })} />
                </div>
                <Field label={tr("الأشخاص المشاركون بإجراء الدراسة")} en="Persons involved" rows={2} value={ea.personsInvolved} onSave={(v) => updateEthicalApproval({ personsInvolved: v })} />
              </>
            )}

            {stop.step === 3 && stop.group !== undefined && (
              <>
                <div className="v3-scroll-x flex gap-2 pb-1">
                  {GROUPS.map((g, gi) => {
                    const on = gi === stop.group;
                    const answered = g.keys.filter((k) => ea.principles[k] !== null).length;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setStopIdx(STOPS.findIndex((s) => s.step === 3 && s.group === gi))}
                        aria-pressed={on}
                        className="v3-tap min-h-[44px] shrink-0 rounded-full px-3.5 text-[13px]"
                        style={on ? { background: "#F6F1EC", color: "#160904", fontWeight: 700 } : { background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", color: "var(--ws-c-text)" }}
                      >
                        {isEn ? g.en : g.ar} · {num(answered)}/{num(g.keys.length)}
                      </button>
                    );
                  })}
                </div>
                <ol className="m-0 list-none p-0">
                  {GROUPS[stop.group].keys.map((k) => {
                    const n = PRINCIPLE_KEYS.indexOf(k) + 1;
                    const val = ea.principles[k];
                    return (
                      <li key={k} className="flex flex-col gap-2.5 border-t py-3 sm:flex-row sm:items-center sm:gap-3.5" style={{ borderColor: "rgba(255,255,255,.07)" }}>
                        <span className="v3-k v3-mut w-6 shrink-0 text-[13px]">{num(n)}</span>
                        <p className="m-0 flex-1 text-[15px]" id={`q-${k}`}>
                          {tr(QUESTION[k])}
                        </p>
                        <div role="radiogroup" aria-labelledby={`q-${k}`} className="flex shrink-0 gap-0.5 self-start rounded-full p-[3px] sm:self-auto" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)" }}>
                          {ANSWERS.map((a) => (
                            <button
                              key={a.v}
                              type="button"
                              role="radio"
                              aria-checked={val === a.v}
                              onClick={() => updateEthicalApproval({ principles: { [k]: a.v } as Partial<EthicalPrinciples> })}
                              className="v3-tap min-h-[44px] rounded-full px-3.5 text-[13px] font-bold transition-colors"
                              style={val === a.v ? a.on : { color: "var(--ws-c-muted)" }}
                            >
                              {tr(a.label)}
                            </button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}

            {stop.step === 4 && (
              <>
                <div>
                  <div className="mb-1.5 text-sm font-bold">
                    {tr("المرفقات المطلوبة")} {!isEn && <span className="v3-en font-normal">Section Three — Attachments</span>}
                  </div>
                  <ul className="m-0 list-none p-0">
                    {attachmentItems.map((item) => (
                      <li key={item.key} className="flex items-center justify-between gap-3 border-t py-1" style={{ borderColor: "rgba(255,255,255,.07)" }}>
                        <label className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-2.5 text-sm font-semibold">
                          <input
                            type="checkbox"
                            checked={ea.attachments[item.key]}
                            onChange={(e) => updateEthicalApproval({ attachments: { [item.key]: e.target.checked } as Partial<EthicalAttachments> })}
                            className="h-5 w-5 accent-[#FF8A24]"
                          />
                          {tr(item.label)}
                        </label>
                        <Link to={item.to} className="v3-link">
                          {tr("جهّزه من هنا ←")}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-bold">{tr("النتيجة")}</span>
                    <select value={ea.outcome} onChange={(e) => updateEthicalApproval({ outcome: e.target.value as typeof ea.outcome })} className="v3-select">
                      {Object.entries(outcomeLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {tr(label)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field label={tr("الرقم المرجعي (Ref. Number)")} value={ea.refNumber ?? ""} onSave={(v) => updateEthicalApproval({ refNumber: v || null })} />
                  <Field label={tr("تاريخ اجتماع اللجنة")} type="date" value={ea.meetingDate ?? ""} onSave={(v) => updateEthicalApproval({ meetingDate: v || null })} />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {ea.approvalLetterFileId ? (
                    <span className="v3-st done !text-sm">
                      <Check size={15} />
                      {tr("خطاب الموافقة مرفوع")}
                    </span>
                  ) : (
                    <FileAttach
                      category="ethical-approval"
                      label={tr("ارفع خطاب الموافقة الرسمي لما يوصل")}
                      onAttach={(meta) => {
                        if (meta.fileRowId) updateEthicalApproval({ approvalLetterFileId: meta.fileRowId });
                      }}
                    />
                  )}
                  <Link to="/files" className="v3-link gap-1.5">
                    <ExternalLink size={12} />
                    {tr("شوف كل الملفات")}
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="v3-bw" onClick={() => exportWord("official")} disabled={exporting}>
                    {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileCheck2 size={16} />}
                    {tr("نموذج التقديم الرسمي (Word)")}
                  </button>
                  <button type="button" className="v3-bd" onClick={() => exportWord("dark")} disabled={exporting} title={tr("نسخة بتصميم Wesync الداكن للمراجعة على الشاشة")}>
                    {tr("نسخة Wesync")}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            {idx > 0 ? (
              <button type="button" className="v3-bd" onClick={() => setStopIdx(idx - 1)}>
                {trx("السابق: {0}", stopLabel(STOPS[idx - 1]))}
              </button>
            ) : (
              <span />
            )}
            {idx < STOPS.length - 1 && (
              <button type="button" className="v3-bw" onClick={() => setStopIdx(idx + 1)}>
                {trx("التالي: {0} ←", stopLabel(STOPS[idx + 1]))}
              </button>
            )}
          </div>
        </section>

        {/* على الجنب */}
        <aside className="grid min-w-0 grid-cols-1 content-start gap-4 sm:grid-cols-2 xl:w-[360px] xl:shrink-0 xl:grid-cols-1">
          <div className="v3-g v3-hover v3-rise flex flex-col gap-3 p-[18px]" style={rise(4)}>
            <div className="flex items-center justify-between gap-2">
              <div className="v3-k text-base">{tr("بيانات مسحوبة من المشروع")}</div>
              <span className="v3-st done">
                <Check size={12} />
                {tr("مربوطة")}
              </span>
            </div>
            {pulled.map((p) => (
              <div key={p.label} className="rounded-[14px] px-3 py-2.5" style={{ background: "rgba(0,0,0,.2)" }}>
                <div className="v3-mut text-xs">{p.label}</div>
                <div className="line-clamp-3 text-sm leading-relaxed" dir="auto" style={{ color: p.value.trim() ? undefined : "var(--ws-c-muted)" }}>
                  {p.value.trim() || tr("لم يُحدد بعد")}
                </div>
                {p.to && (
                  <Link to={p.to} className="v3-link !min-h-[32px] text-xs">
                    {p.where}
                  </Link>
                )}
              </div>
            ))}
          </div>
          <div className="v3-g v3-hover v3-rise flex items-center gap-3 px-[18px] py-4" style={rise(5)}>
            <div className="flex h-[58px] w-[46px] shrink-0 items-end justify-center rounded-lg pb-1.5 text-[13px] font-extrabold" style={{ background: "linear-gradient(180deg,#F6F1EC,#E3D3C2)", color: "#2B579A" }} aria-hidden>
              W
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold">{tr("معاينة النموذج")}</div>
              <div className="v3-mut text-xs">{trx("يتعبّى وأنتم تجاوبون · {0} من {1} مبدأ", num(s3), num(PRINCIPLE_KEYS.length))}</div>
            </div>
            <button type="button" className="v3-bd !text-[13px]" onClick={() => goStep(4)}>
              {tr("افتح")}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
