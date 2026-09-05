import { useState, type ChangeEvent } from "react";
import { AlertTriangle, ArrowDown, CheckCircle2, Circle, FileDown, FileStack, FileText, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import Card, { CardHeader } from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import ProgressBar from "../components/ui/ProgressBar";
import FileAttach, { type AttachedFileMeta } from "../components/FileAttach";
import { useProposal } from "../hooks/useProposal";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useResearchProject } from "../hooks/useResearchProject";
import type { SectionStatus } from "../data/types";
import { formatDateLong } from "../lib/date";

const PROPOSAL_ATTACHMENTS_KEY = "nursync.proposalAttachments";

function loadProposalAttachments(): Record<string, AttachedFileMeta> {
  try {
    const raw = localStorage.getItem(PROPOSAL_ATTACHMENTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AttachedFileMeta>) : {};
  } catch {
    return {};
  }
}

const statusLabel: Record<SectionStatus, string> = {
  done: "مكتمل",
  "in-progress": "قيد العمل",
  "not-started": "لم يبدأ",
};

const statusChip: Record<SectionStatus, string> = {
  done: "text-brand-600 bg-brand-50",
  "in-progress": "text-amber-accent-600 bg-amber-accent-50",
  "not-started": "text-brand-950/40 bg-surface-muted",
};

function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === "done") return <CheckCircle2 size={20} className="shrink-0 text-brand-500" />;
  if (status === "in-progress")
    return <RefreshCw size={18} className="shrink-0 text-amber-accent-500" />;
  return <Circle size={18} className="shrink-0 text-brand-950/25" />;
}

/** حقل نصي يُحفظ عند الخروج منه (blur) فقط — مو مع كل ضغطة زر، حتى ما نضغط
    قاعدة البيانات بكل حرف. يحتفظ بمسودة محلية لحين الحفظ. */
function AutoSaveTextarea({
  value,
  onSave,
  placeholder,
  rows = 3,
}: {
  value: string;
  onSave: (next: string) => void;
  placeholder: string;
  rows?: number;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <textarea
      value={draft}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onSave(draft);
      }}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-y rounded-xl border border-brand-100 bg-paper px-3 py-2 text-sm text-brand-950 outline-none placeholder:text-brand-950/30 focus:border-brand-300"
    />
  );
}

export default function Proposal() {
  const { sections, gap, aim, questions, updateSection, updateGap, updateAimStatement, setResearchQuestions } =
    useProposal();
  const { project } = useResearchProject();
  const { roster } = useTeamRoster();
  const memberById = (id: string) => roster.find((m) => m.id === id);
  const doneCount = sections.filter((s) => s.status === "done").length;
  const completionPct = sections.length > 0 ? Math.round((doneCount / sections.length) * 100) : 0;
  const [sectionAttachments, setSectionAttachments] =
    useState<Record<string, AttachedFileMeta>>(loadProposalAttachments);

  const attachToSection = (key: string, meta: AttachedFileMeta) => {
    setSectionAttachments((prev) => {
      const updated = { ...prev, [key]: meta };
      localStorage.setItem(PROPOSAL_ATTACHMENTS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="space-y-5">
      {/* يبين بس عند الطباعة/تصدير PDF — ترويسة رسمية للمستند */}
      <div className="hidden print:block">
        <h1 className="font-display text-2xl font-extrabold text-brand-950">
          {project?.title || "المقترح البحثي"}
        </h1>
        {project?.description && (
          <p className="mt-1 text-sm text-brand-950/60" dir="ltr">
            {project.description}
          </p>
        )}
        <p className="mt-3 text-xs text-brand-950/45">
          تم التصدير بتاريخ {formatDateLong(new Date().toISOString().slice(0, 10))} — Wesync
        </p>
        <div className="my-4 border-t border-brand-200" />
      </div>

      <Card tone="cream" className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="font-display text-base font-bold text-brand-950">
            المقترح البحثي <span className="text-brand-950/40">— Research Proposal</span>
          </h2>
          <p className="mt-1 text-sm text-brand-950/50">
            {doneCount} من {sections.length} أقسام مكتملة
          </p>
        </div>
        <div className="w-full max-w-xs shrink grow">
          <ProgressBar value={completionPct} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/proposal/export"
            title="وثيقة واحدة تجمع المقترح والمنهجية وقائمة المراجع"
            className="flex items-center gap-2 rounded-xl border border-brand-200 bg-paper px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-brand-50"
          >
            <FileStack size={16} />
            الوثيقة الكاملة
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
          >
            <FileDown size={16} />
            تصدير PDF
          </button>
        </div>
      </Card>

      {/* Proposal Progress checklist — كل قسم قابل للتحرير ويُحفظ فورًا */}
      <Card className="print:break-inside-avoid">
        <CardHeader title="مكونات المقترح البحثي" subtitle="Proposal Components" />
        <ul className="divide-y divide-brand-50">
          {sections.map((section) => {
            const owner = memberById(section.ownerId);
            return (
              <li key={section.key} className="space-y-2.5 py-3">
                <div className="flex items-center gap-3">
                  <StatusIcon status={section.status} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-brand-950">{section.labelAr}</p>
                    <p className="text-xs text-brand-950/45">{section.labelEn}</p>
                    {sectionAttachments[section.key] && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-brand-600">
                        <FileText size={12} />
                        <bdi className="truncate">{sectionAttachments[section.key].name}</bdi>
                      </p>
                    )}
                  </div>
                  {!sectionAttachments[section.key] && (
                    <div className="print:hidden">
                      <FileAttach compact onAttach={(meta) => attachToSection(section.key, meta)} />
                    </div>
                  )}
                  {owner && <Avatar initials={owner.initials} color={owner.color} size="sm" />}
                  <select
                    value={section.status}
                    onChange={(e) => updateSection(section.key, { status: e.target.value as SectionStatus })}
                    className={`whitespace-nowrap rounded-full border-0 px-2.5 py-1 text-xs font-bold outline-none print:hidden ${statusChip[section.status]}`}
                  >
                    {(Object.keys(statusLabel) as SectionStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {statusLabel[s]}
                      </option>
                    ))}
                  </select>
                  <span className={`hidden whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold print:inline ${statusChip[section.status]}`}>
                    {statusLabel[section.status]}
                  </span>
                </div>
                <AutoSaveTextarea
                  value={section.content}
                  onSave={(content) => updateSection(section.key, { content })}
                  placeholder="اكتبوا محتوى هذا القسم هنا..."
                />
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Research Gap */}
      <Card tone="amber" className="print:break-inside-avoid">
        <CardHeader title="الفجوة البحثية" subtitle="Research Gap" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-paper p-4">
            <p className="mb-2 text-sm font-bold text-brand-950">ما نعرفه</p>
            <AutoSaveTextarea
              value={gap.whatWeKnow.join("\n")}
              onSave={(v) => updateGap({ whatWeKnow: v.split("\n").filter(Boolean) })}
              placeholder={"سطر لكل نقطة..."}
              rows={4}
            />
          </div>
          <div className="rounded-2xl bg-paper p-4">
            <p className="mb-2 text-sm font-bold text-brand-950">ما لا نعرفه</p>
            <AutoSaveTextarea
              value={gap.whatWeDontKnow.join("\n")}
              onSave={(v) => updateGap({ whatWeDontKnow: v.split("\n").filter(Boolean) })}
              placeholder={"سطر لكل نقطة..."}
              rows={4}
            />
          </div>
        </div>

        <div className="my-3 flex justify-center">
          <ArrowDown size={18} className="text-amber-accent-600" />
        </div>

        <div className="rounded-2xl border-2 border-amber-accent-400 bg-paper p-4">
          <p className="mb-1.5 text-sm font-bold text-amber-accent-700">الفجوة البحثية — Research Gap</p>
          <AutoSaveTextarea
            value={gap.gapStatement}
            onSave={(v) => updateGap({ gapStatement: v })}
            placeholder="اكتبوا صياغة الفجوة البحثية هنا..."
          />
        </div>

        <div className="my-3 flex justify-center">
          <ArrowDown size={18} className="text-amber-accent-600" />
        </div>

        <div className="rounded-2xl bg-paper p-4">
          <p className="mb-1.5 text-sm font-bold text-brand-950">ما ستدرسه — Your Study</p>
          <AutoSaveTextarea
            value={gap.studyConnection}
            onSave={(v) => updateGap({ studyConnection: v })}
            placeholder="كيف تربط دراستكم بهذي الفجوة؟"
          />
        </div>

        {!gap.connectsToAim && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500" />
            <p className="text-sm font-semibold text-rose-600">
              تنبيه: الفجوة البحثية لسا ما ترتبط بوضوح بهدف الدراسة (Aim) — لازم تُصاغ الفجوة أولًا
              بشكل نهائي قبل كتابة الهدف.
            </p>
          </div>
        )}
      </Card>

      {/* Aim & Research Questions */}
      <Card className="print:break-inside-avoid">
        <CardHeader title="هدف الدراسة وأسئلة البحث" subtitle="Aim & Research Questions" />

        <div className="rounded-2xl bg-surface-muted p-4">
          <p className="mb-1.5 text-sm font-bold text-brand-950">هدف الدراسة — Purpose / Aim</p>
          <AutoSaveTextarea
            value={aim.statement}
            onSave={(v) => updateAimStatement(v)}
            placeholder="اكتبوا هدف الدراسة هنا..."
          />
        </div>

        <div className="mt-3 rounded-2xl bg-surface-muted p-4">
          <p className="mb-1.5 text-sm font-bold text-brand-950">أسئلة البحث — Research Questions</p>
          <AutoSaveTextarea
            value={questions.map((q) => q.text).join("\n")}
            onSave={(v) => setResearchQuestions(v.split("\n").filter(Boolean))}
            placeholder={"سؤال بحث واحد بكل سطر..."}
            rows={4}
          />
        </div>
      </Card>
    </div>
  );
}
