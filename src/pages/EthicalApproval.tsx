import { useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent } from "react";
import { Check, ExternalLink, Eye, FileCheck2, FileText, Loader2, Wand2 } from "lucide-react";
import AgentWave from "../components/ui/AgentWave";
import { EditorCard, SectionRail } from "../components/v3/WriteKit";
import { openAgent, setAgentContext } from "../lib/agentBus";
import { Link } from "react-router-dom";
import FileAttach from "../components/FileAttach";
import WriteHeader, { V3Glow, num } from "../components/v3/WriteHeader";
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
    <label className="wf-fld !mt-0 block">
      <span className="wf-lbl flex flex-wrap items-center gap-x-2">
        <span>
          {label} {en && !isEn && <span className="font-normal" dir="ltr">· {en}</span>}
        </span>
        <SavedTick at={savedAt} />
      </span>
      {rows ? <textarea {...common} rows={rows} className="wf-ed sm !min-h-0" /> : <input {...common} type={type} className="wf-fin" />}
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

  const pulled = [
    { label: tr("عنوان الدراسة"), value: project?.title ?? "", to: null as string | null },
    { label: tr("الهدف"), value: aim.statement, to: "/proposal?section=aim" },
    { label: tr("التصميم"), value: methodology.studyDesign, to: "/methodology" },
    { label: tr("مكان الدراسة"), value: methodology.studySetting, to: "/methodology" },
  ];

  // الأقسام بالقائمة = محطات النموذج: البيانات، الفريق، مجموعات المبادئ الأربع، المرفقات
  const stopDone = (st: Stop) =>
    st.step === 3 && st.group !== undefined ? GROUPS[st.group].keys.every((k) => ea.principles[k] !== null) : stepDone[st.step - 1];
  const stopEn = (st: Stop) => (st.step === 3 && st.group !== undefined ? GROUPS[st.group].en : steps[st.step - 1].en);
  const stopGroup = (st: Stop) => (st.step <= 2 ? tr("معلومات أساسية") : st.step === 3 ? tr("حماية المشاركين") : tr("الأوراق والمرفقات"));
  const doneStops = STOPS.filter(stopDone).length;
  const label = stopLabel(stop);
  useEffect(() => {
    setAgentContext(label);
    return () => setAgentContext(null);
  }, [label]);

  const hint =
    stop.step === 1
      ? tr("العنوان والهدف والتصميم والمكان تنسحب لحالها من المقترح والمنهجية. هنا بس التواريخ والتمويل وإدارة البيانات.")
      : stop.step === 2
        ? tr("الباحث الرئيسي غالبًا قائد الفريق. اضغطوا «عبّوه من الفريق» ونعبّي الأسماء والإيميلات، وراجعوها.")
        : stop.step === 3
          ? tr("لجنة الأخلاقيات تبغى تعرف كيف بتحمون المشاركين. جاوبوا كل سؤال بـ«نعم» أو «لا» أو «لا ينطبق».")
          : tr("علّموا المرفقات اللي جهزت، وبعدها نزّلوا النموذج الرسمي Word وقدّموه للجنة.");

  return (
    <div className="v3 relative">
      <V3Glow />
      <WriteHeader fallbackTitle={tr("الموافقة الأخلاقية")} style={rise(0)} live={{ ethics: s3 }} />

      <div className="relative grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[340px_minmax(0,1fr)]">
        <SectionRail
          title={tr("نموذج الموافقة الأخلاقية")}
          items={STOPS.map((st, i) => ({ key: String(i), label: stopLabel(st), en: stopEn(st), done: stopDone(st), group: stopGroup(st) }))}
          activeKey={String(idx)}
          onPick={(k) => setStopIdx(Number(k))}
          style={rise(1)}
          footer={
            <>
              <button type="button" className="wf-gb" onClick={() => exportWord("dark")} disabled={exporting} title={tr("نسخة بتصميم Wesync الداكن للمراجعة على الشاشة")}>
                <Eye size={16} aria-hidden />
                {tr("نسخة Wesync")}
              </button>
              <button type="button" className="wf-gb" onClick={() => exportWord("official")} disabled={exporting} title={tr("نسق KAU الرسمي (أبيض) — هذا اللي يُقدَّم للجنة")}>
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileCheck2 size={16} aria-hidden />}
                {tr("Word الرسمي")}
              </button>
            </>
          }
        />

        <div className="flex min-w-0 flex-col gap-[18px]">
          <EditorCard
            index={idx + 1}
            total={STOPS.length}
            title={label}
            en={stopEn(stop)}
            paper={paper}
            onPaper={setPaper}
            hint={hint}
            style={rise(2)}
            titleId="v3-step-title"
          >
            <div key={`${stop.step}-${stop.group ?? ""}`} className="flex flex-col gap-3.5">
              {stop.step === 1 && (
                <>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {pulled.map((p) => (
                      <div key={p.label} className="wf-tpl !block">
                        <div className="text-xs text-[#ABA095]">{p.label}</div>
                        <div className="line-clamp-2 text-sm leading-relaxed" dir="auto" style={{ color: p.value.trim() ? undefined : "#8F857C" }}>
                          {p.value.trim() || tr("لم يُحدد بعد")}
                        </div>
                        {p.to && (
                          <Link to={p.to} className="text-xs font-bold text-[#FFC777]">
                            {tr("عدّل ←")}
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
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
                  <button type="button" className="wf-gb self-start" onClick={autoFillFromTeam}>
                    <Wand2 size={16} aria-hidden />
                    {tr("عبّوه من الفريق")}
                  </button>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label={tr("اسم الباحث الرئيسي")} en="PI name" value={ea.piName} onSave={(v) => updateEthicalApproval({ piName: v })} />
                    <Field label={tr("الجهة")} en="Affiliation" value={ea.piAffiliation} onSave={(v) => updateEthicalApproval({ piAffiliation: v })} />
                    <Field label={tr("البريد الإلكتروني")} en="Email" type="email" value={ea.piEmail} onSave={(v) => updateEthicalApproval({ piEmail: v })} />
                    <div className="wf-fld !mt-0">
                      <span className="wf-lbl">
                        {tr("نوع الباحث الرئيسي")} {!isEn && <span className="font-normal">· PI type</span>}
                      </span>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr("نوع الباحث الرئيسي")}>
                        {(
                          [
                            ["undergraduate", tr("بكالوريوس")],
                            ["graduate", tr("دراسات عليا")],
                            ["faculty", tr("هيئة تدريس")],
                          ] as [PiType, string][]
                        ).map(([v, l]) => (
                          <button key={v} type="button" role="radio" aria-checked={ea.piType === v} className="wf-opt" onClick={() => updateEthicalApproval({ piType: v })}>
                            <span className="wf-rd" aria-hidden />
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
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
                <ol className="m-0 list-none p-0">
                  {GROUPS[stop.group].keys.map((k) => {
                    const n = PRINCIPLE_KEYS.indexOf(k) + 1;
                    const val = ea.principles[k];
                    return (
                      <li key={k} className="flex flex-col gap-2.5 border-t py-3 sm:flex-row sm:items-center sm:gap-3.5" style={{ borderColor: "rgba(255,255,255,.07)" }}>
                        <span className="wf-num w-6 shrink-0 text-[13px] text-[#ABA095]">{n}</span>
                        <p className="m-0 flex-1 text-[15px] leading-relaxed" id={`q-${k}`}>
                          {tr(QUESTION[k])}
                        </p>
                        <div role="radiogroup" aria-labelledby={`q-${k}`} className="flex shrink-0 flex-wrap gap-1.5">
                          {ANSWERS.map((a) => (
                            <button key={a.v} type="button" role="radio" aria-checked={val === a.v} onClick={() => updateEthicalApproval({ principles: { [k]: a.v } as Partial<EthicalPrinciples> })} className="wf-opt !min-h-[40px]">
                              <span className="wf-rd" aria-hidden />
                              {tr(a.label)}
                            </button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              {stop.step === 4 && (
                <>
                  <div>
                    <div className="wf-lbl mb-1.5 text-[13px] font-bold text-[#ABA095]">
                      {tr("المرفقات المطلوبة")} {!isEn && <span className="font-normal">· Attachments</span>}
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
                          <Link to={item.to} className="text-[13px] font-bold text-[#FFC777]">
                            {tr("جهّزه من هنا ←")}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="wf-fld !mt-0 block">
                      <span className="wf-lbl">{tr("النتيجة")}</span>
                      <select value={ea.outcome} onChange={(e) => updateEthicalApproval({ outcome: e.target.value as typeof ea.outcome })} className="wf-fin">
                        {Object.entries(outcomeLabel).map(([value, l]) => (
                          <option key={value} value={value}>
                            {tr(l)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Field label={tr("الرقم المرجعي (Ref. Number)")} value={ea.refNumber ?? ""} onSave={(v) => updateEthicalApproval({ refNumber: v || null })} />
                    <Field label={tr("تاريخ اجتماع اللجنة")} type="date" value={ea.meetingDate ?? ""} onSave={(v) => updateEthicalApproval({ meetingDate: v || null })} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {ea.approvalLetterFileId ? (
                      <span className="wf-st done !ms-0 !text-sm">
                        <Check size={15} className="inline" /> {tr("خطاب الموافقة مرفوع")}
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
                    <Link to="/files" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#FFC777]">
                      <ExternalLink size={12} />
                      {tr("شوف كل الملفات")}
                    </Link>
                  </div>
                </>
              )}
            </div>

            <div className="ws-write-foot flex flex-wrap items-center gap-2.5">
              <span className="text-[13px] text-[#ABA095]">{tr("ينحفظ تلقائيًا")}</span>
              <span className="flex-1" />
              <button type="button" className="wf-gb" onClick={() => openAgent(tr("ساعدني أعبّي «{0}» في نموذج الموافقة الأخلاقية", label))}>
                <AgentWave size={15} />
                {tr("ساعدني")}
              </button>
              {idx > 0 && (
                <button type="button" className="wf-gb" onClick={() => setStopIdx(idx - 1)}>
                  {tr("السابق")}
                </button>
              )}
              {idx < STOPS.length - 1 ? (
                <button type="button" className="wf-pr" onClick={() => setStopIdx(idx + 1)}>
                  {trx("التالي: {0} ←", stopLabel(STOPS[idx + 1]))}
                </button>
              ) : (
                <button type="button" className="wf-pr" onClick={() => exportWord("official")} disabled={exporting}>
                  {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileCheck2 size={16} />}
                  {tr("نموذج التقديم الرسمي (Word)")}
                </button>
              )}
            </div>
          </EditorCard>

          <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
            <section className="hg-card" style={rise(3)} aria-labelledby="e-tpl-title">
              <h3 id="e-tpl-title" className="m-0 text-[18px] font-extrabold">
                {tr("القوالب الجاهزة")}
              </h3>
              <div className="mt-0.5 text-[13px] text-[#ABA095]">{tr("نماذج الموافقة والإذن في حقيبة الاستبيان، تتعبّى ببيانات بحثكم.")}</div>
              <div className="mt-3 grid gap-2">
                {[
                  { t: tr("نموذج الموافقة المستنيرة"), d: tr("للمشاركين قبل البدء") },
                  { t: tr("خطاب الجهة"), d: tr("إذن جمع البيانات من مكان الدراسة") },
                ].map((x) => (
                  <div key={x.t} className="wf-tpl">
                    <FileText size={18} className="shrink-0 text-[#FFC777]" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <b className="text-sm">{x.t}</b>
                      <div className="text-xs text-[#ABA095]">{x.d}</div>
                    </div>
                    <Link to="/study-kit" className="wf-gb !min-h-[38px] !px-3.5">
                      {tr("افتح")}
                    </Link>
                  </div>
                ))}
              </div>
            </section>

            <section className="hg-card" style={rise(4)} aria-labelledby="e-ready-title">
              <h3 id="e-ready-title" className="m-0 text-[18px] font-extrabold">
                {tr("جاهزية التقديم للجنة")}
              </h3>
              <div className="mt-0.5 text-[13px] text-[#ABA095]">{tr("لما تكتمل الأقسام والمرفقات، نزّلوا النموذج الرسمي وقدّموه.")}</div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-valuemin={0} aria-valuemax={STOPS.length} aria-valuenow={doneStops} aria-label={tr("جاهزية التقديم")}>
                <div className="h-full rounded-full" style={{ width: `${(doneStops / STOPS.length) * 100}%`, background: "linear-gradient(90deg,#FF6A00,#FFC777)" }} />
              </div>
              <div className="mt-2.5">
                <div className="wf-kv">
                  <span>{tr("الأقسام")}</span>
                  <b className="wf-num">
                    {doneStops}/{STOPS.length}
                  </b>
                </div>
                <div className="wf-kv">
                  <span>{tr("المبادئ")}</span>
                  <b className="wf-num">
                    {s3}/{PRINCIPLE_KEYS.length}
                  </b>
                </div>
                <div className="wf-kv">
                  <span>{tr("المرفقات")}</span>
                  <b className="wf-num">
                    {s4}/{attachmentItems.length}
                  </b>
                </div>
                <div className="wf-kv">
                  <span>{tr("النتيجة")}</span>
                  <b style={{ color: ea.outcome === "granted" ? "#7FE0A6" : ea.outcome === "rejected" ? "#FF8A7A" : "#ABA095" }}>{tr(outcomeLabel[ea.outcome] ?? outcomeLabel.pending)}</b>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
