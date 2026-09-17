import { useState, type ChangeEvent } from "react";
import {
  Building2,
  Check,
  ExternalLink,
  FileCheck2,
  Loader2,
  Sparkles,
  Users2,
} from "lucide-react";
import { Link } from "react-router-dom";
import Card, { CardHeader } from "../components/ui/Card";
import FileAttach from "../components/FileAttach";
import { useEthicalApproval } from "../hooks/useEthicalApproval";
import { useResearchProject } from "../hooks/useResearchProject";
import { useProposal } from "../hooks/useProposal";
import { useMethodology } from "../hooks/useMethodology";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { buildEthicalApprovalDoc } from "../lib/ethicalApprovalExport";
import { downloadWordDoc } from "../lib/wordExport";
import type { EthicalAttachments, EthicalPrinciples, EthicalPrincipleAnswer, PiType } from "../data/types";

const inputClass =
  "w-full rounded-lg border border-brand-100 px-3 py-2 text-sm outline-none focus:border-brand-300";

/** حقل نصي بسطر واحد يُحفظ عند الخروج منه فقط — نفس نمط EditableField بصفحة المنهجية */
function EditableField({
  label,
  value,
  onSave,
  type = "text",
}: {
  label: string;
  value: string;
  onSave: (next: string) => void;
  type?: "text" | "date" | "email";
}) {
  const [draft, setDraft] = useState(value);
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-brand-950/70">{label}</span>
      <input
        type={type}
        value={draft}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== value) onSave(draft);
        }}
        className={inputClass}
      />
    </label>
  );
}

function EditableTextarea({
  label,
  value,
  onSave,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (next: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-brand-950/70">{label}</span>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== value) onSave(draft);
        }}
        rows={rows}
        placeholder={placeholder}
        className={`${inputClass} resize-y`}
      />
    </label>
  );
}

const principleQuestions: { key: keyof EthicalPrinciples; text: string }[] = [
  { key: "writtenExplanation", text: "هل سيُقدَّم للمشاركين شرح مكتوب عن البحث؟" },
  { key: "oralExplanation", text: "هل سيُقدَّم للمشاركين شرح شفهي عن البحث؟" },
  { key: "writtenConsent", text: "هل سيوقّع المشاركون على نموذج موافقة؟" },
  { key: "oralConsent", text: "هل ستُؤخذ موافقة شفهية من المشاركين؟" },
  { key: "voluntaryInformed", text: "هل سيُخبَر المشاركون أن المشاركة اختيارية؟" },
  { key: "withdrawOption", text: "هل ستُتاح للمشاركين فرصة الانسحاب بأي مرحلة دون إبداء سبب؟" },
  { key: "harmInformed", text: "هل سيُخبَر المشاركون بأي ضرر محتمل من المشاركة؟" },
  { key: "confidentialityGuaranteed", text: "هل ستُضمَن سرية بيانات المشاركين؟" },
  { key: "anonymityGuaranteed", text: "هل ستُضمَن إخفاء هوية المشاركين؟" },
  {
    key: "vulnerableGroupsInformed",
    text: "لو شمل البحث فئات مستضعفة (أطفال دون ١٨، كبار السن، ...) — هل سيُخبَرون أنهم يقدرون يتجاوزون أي سؤال ما يرغبون بالإجابة عليه؟",
  },
  {
    key: "interviewNoExplanationNeeded",
    text: "لو تضمّن البحث مقابلات — هل سيُخبَر المشاركون أنهم غير مُلزَمين بالإجابة على أي سؤال بدون تفسير؟",
  },
  { key: "safeDataStorage", text: "هل تم تأمين تخزين آمن للبيانات؟" },
  { key: "willPublish", text: "هل سينشر الباحث/ون نتائج البحث؟" },
];

const attachmentItems: { key: keyof EthicalAttachments; label: string; to: string }[] = [
  { key: "protocolOrProposal", label: "المقترح البحثي (Protocol)", to: "/proposal" },
  { key: "participantInfoSheet", label: "ورقة معلومات المشارك", to: "/files" },
  { key: "consentForm", label: "نموذج الموافقة (Consent Form)", to: "/files" },
  { key: "studyTools", label: "أداة الدراسة", to: "/methodology" },
  { key: "otherSupportiveDocs", label: "مستندات داعمة أخرى", to: "/files" },
];

const answerLabel: Record<Exclude<EthicalPrincipleAnswer, null>, string> = {
  yes: "نعم",
  no: "لا",
  na: "لا ينطبق",
};

function PrincipleToggle({
  value,
  onChange,
}: {
  value: EthicalPrincipleAnswer;
  onChange: (next: EthicalPrincipleAnswer) => void;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      {(["yes", "no", "na"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
            value === opt
              ? opt === "yes"
                ? "bg-brand-500 text-white"
                : opt === "no"
                  ? "bg-rose-500 text-white"
                  : "bg-brand-950/60 text-white"
              : "bg-surface-muted text-brand-950/50 hover:bg-brand-50"
          }`}
        >
          {answerLabel[opt]}
        </button>
      ))}
    </div>
  );
}

const outcomeLabel: Record<string, string> = {
  pending: "بانتظار الرد",
  granted: "تمت الموافقة",
  amendments: "مطلوب تعديلات",
  rejected: "مرفوض",
};

export default function EthicalApprovalPage() {
  const { ethicalApproval, updateEthicalApproval } = useEthicalApproval();
  const { project } = useResearchProject();
  const { aim } = useProposal();
  const { methodology } = useMethodology();
  const { roster } = useTeamRoster();
  const [exporting, setExporting] = useState(false);

  const autoFillFromTeam = () => {
    const leader = roster.find((m) => m.role === "leader");
    const others = roster
      .filter((m) => m.id !== leader?.id)
      .map((m) => `${m.name} — ${m.title} — ${m.email}`)
      .join("\n");
    updateEthicalApproval({
      piName: leader?.name ?? "",
      piEmail: leader?.email ?? "",
      otherResearchers: others,
    });
  };

  const exportWord = async () => {
    setExporting(true);
    try {
      const blob = await buildEthicalApprovalDoc({
        projectTitle: project?.title ?? "",
        aim: aim.statement,
        design: methodology.studyDesign,
        setting: methodology.studySetting,
        ethicalApproval,
      });
      downloadWordDoc(blob, "طلب-الموافقة-الأخلاقية.docx");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card tone="cream" className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-accent-500 text-white">
            <FileCheck2 size={18} />
          </span>
          <div>
            <h2 className="font-display text-base font-bold text-brand-950">
              طلب الموافقة الأخلاقية — Ethical Approval
            </h2>
            <p className="mt-0.5 text-sm text-brand-950/50">مطلوب رسميًا مع المقترح البحثي، بنفس تاريخ تسليمه.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={autoFillFromTeam}
            className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-paper px-3.5 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50"
          >
            <Sparkles size={15} />
            تعبئة تلقائية من الفريق
          </button>
          <button
            onClick={exportWord}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileCheck2 size={15} />}
            تصدير نموذج التقديم (Word)
          </button>
        </div>
      </Card>

      {/* ملخص حقائق مسحوبة من المصدر مباشرة — بدون نسخة ثانية قابلة للتضارب */}
      <Card>
        <CardHeader title="بيانات مسحوبة من المشروع" subtitle="Pulled live — edit at the source" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-surface-muted p-4">
            <p className="text-xs font-bold text-brand-950/45">عنوان الدراسة</p>
            <p className="mt-1 text-sm font-semibold text-brand-950">{project?.title || "لم يُحدد بعد"}</p>
          </div>
          <div className="rounded-2xl bg-surface-muted p-4">
            <p className="text-xs font-bold text-brand-950/45">الهدف — Aim</p>
            <p className="mt-1 text-sm font-semibold text-brand-950">
              {aim.statement || "لم يُحدد بعد"}
            </p>
            <Link to="/proposal" className="mt-1.5 inline-block text-xs font-bold text-brand-600 hover:underline">
              عدّل في المقترح البحثي →
            </Link>
          </div>
          <div className="rounded-2xl bg-surface-muted p-4">
            <p className="text-xs font-bold text-brand-950/45">التصميم — Design</p>
            <p className="mt-1 text-sm font-semibold text-brand-950">{methodology.studyDesign || "لم يُحدد بعد"}</p>
            <Link to="/methodology" className="mt-1.5 inline-block text-xs font-bold text-brand-600 hover:underline">
              عدّل في المنهجية →
            </Link>
          </div>
          <div className="rounded-2xl bg-surface-muted p-4">
            <p className="text-xs font-bold text-brand-950/45">مكان الدراسة — Setting</p>
            <p className="mt-1 text-sm font-semibold text-brand-950">{methodology.studySetting || "لم يُحدد بعد"}</p>
            <Link to="/methodology" className="mt-1.5 inline-block text-xs font-bold text-brand-600 hover:underline">
              عدّل في المنهجية →
            </Link>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="الباحث الرئيسي والفريق"
          subtitle="Principal Investigator & Researchers"
          action={<Users2 size={18} className="text-brand-600" />}
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <EditableField
            label="اسم الباحث الرئيسي"
            value={ethicalApproval.piName}
            onSave={(v) => updateEthicalApproval({ piName: v })}
          />
          <EditableField
            label="الجهة"
            value={ethicalApproval.piAffiliation}
            onSave={(v) => updateEthicalApproval({ piAffiliation: v })}
          />
          <EditableField
            label="البريد الإلكتروني"
            type="email"
            value={ethicalApproval.piEmail}
            onSave={(v) => updateEthicalApproval({ piEmail: v })}
          />
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-brand-950/70">نوع الباحث الرئيسي</span>
            <select
              value={ethicalApproval.piType}
              onChange={(e) => updateEthicalApproval({ piType: e.target.value as PiType })}
              className={inputClass}
            >
              <option value="undergraduate">طالب/ة بكالوريوس</option>
              <option value="graduate">طالب/ة دراسات عليا</option>
              <option value="faculty">عضو هيئة تدريس</option>
            </select>
          </label>
        </div>
        <div className="mt-3">
          <EditableTextarea
            label="باحثون آخرون — سطر لكل باحث: الاسم — الجهة — البريد"
            value={ethicalApproval.otherResearchers}
            onSave={(v) => updateEthicalApproval({ otherResearchers: v })}
            rows={3}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <EditableField
            label="اسم/أسماء المشرف الأكاديمي"
            value={ethicalApproval.supervisorNames}
            onSave={(v) => updateEthicalApproval({ supervisorNames: v })}
          />
          <EditableField
            label="الرقم الجامعي (إن وجد)"
            value={ethicalApproval.registrationNo}
            onSave={(v) => updateEthicalApproval({ registrationNo: v })}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="التواريخ والتمويل"
          subtitle="Dates & Funding"
          action={<Building2 size={18} className="text-brand-600" />}
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <EditableField
            label="تاريخ تقديم الطلب"
            type="date"
            value={ethicalApproval.applicationDate ?? ""}
            onSave={(v) => updateEthicalApproval({ applicationDate: v || null })}
          />
          <div />
          <EditableField
            label="تاريخ البدء المتوقع"
            type="date"
            value={ethicalApproval.expectedStartDate ?? ""}
            onSave={(v) => updateEthicalApproval({ expectedStartDate: v || null })}
          />
          <EditableField
            label="تاريخ الانتهاء المتوقع"
            type="date"
            value={ethicalApproval.expectedEndDate ?? ""}
            onSave={(v) => updateEthicalApproval({ expectedEndDate: v || null })}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <EditableTextarea
            label="الأشخاص المشاركون بإجراء الدراسة"
            value={ethicalApproval.personsInvolved}
            onSave={(v) => updateEthicalApproval({ personsInvolved: v })}
            rows={2}
          />
          <EditableTextarea
            label="كيف ستُدار البيانات وتُحفظ سريتها"
            value={ethicalApproval.dataManagementConfidentiality}
            onSave={(v) => updateEthicalApproval({ dataManagementConfidentiality: v })}
            rows={2}
          />
        </div>
        <div className="mt-3">
          <EditableTextarea
            label="تفاصيل أي تمويل أو دعم مالي (إن وجد)"
            value={ethicalApproval.fundingDetails}
            onSave={(v) => updateEthicalApproval({ fundingDetails: v })}
            rows={2}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="المبادئ الأخلاقية" subtitle="Section Two — Ethical Principles" />
        <ul className="divide-y divide-brand-50">
          {principleQuestions.map((q) => (
            <li key={q.key} className="flex items-center gap-3 py-2.5">
              <p className="flex-1 text-sm text-brand-950/80">{q.text}</p>
              <PrincipleToggle
                value={ethicalApproval.principles[q.key]}
                onChange={(next) => updateEthicalApproval({ principles: { [q.key]: next } })}
              />
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="المرفقات المطلوبة" subtitle="Section Three — Attachments" />
        <ul className="divide-y divide-brand-50">
          {attachmentItems.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-3 py-2.5">
              <label className="flex flex-1 items-center gap-2.5 text-sm font-semibold text-brand-950">
                <input
                  type="checkbox"
                  checked={ethicalApproval.attachments[item.key]}
                  onChange={(e) => updateEthicalApproval({ attachments: { [item.key]: e.target.checked } })}
                  className="h-4 w-4 accent-brand-500"
                />
                {item.label}
              </label>
              <Link to={item.to} className="text-xs font-bold text-brand-600 hover:underline">
                جهّزه من هنا →
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card tone="amber">
        <CardHeader title="حالة الطلب" subtitle="Committee Outcome" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-brand-950/70">النتيجة</span>
            <select
              value={ethicalApproval.outcome}
              onChange={(e) => updateEthicalApproval({ outcome: e.target.value as typeof ethicalApproval.outcome })}
              className={inputClass}
            >
              {Object.entries(outcomeLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <EditableField
            label="الرقم المرجعي (Ref. Number)"
            value={ethicalApproval.refNumber ?? ""}
            onSave={(v) => updateEthicalApproval({ refNumber: v || null })}
          />
          <EditableField
            label="تاريخ اجتماع اللجنة"
            type="date"
            value={ethicalApproval.meetingDate ?? ""}
            onSave={(v) => updateEthicalApproval({ meetingDate: v || null })}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {ethicalApproval.approvalLetterFileId ? (
            <span className="flex items-center gap-1.5 rounded-xl bg-brand-50 px-3.5 py-2 text-sm font-bold text-brand-700">
              <Check size={15} />
              خطاب الموافقة مرفوع
            </span>
          ) : (
            <FileAttach
              category="ethical-approval"
              label="ارفع خطاب الموافقة الرسمي لما يوصل"
              onAttach={(meta) => {
                if (meta.fileRowId) updateEthicalApproval({ approvalLetterFileId: meta.fileRowId });
              }}
            />
          )}
          <Link
            to="/files"
            className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline"
          >
            <ExternalLink size={12} />
            شوف كل الملفات
          </Link>
        </div>
      </Card>
    </div>
  );
}
