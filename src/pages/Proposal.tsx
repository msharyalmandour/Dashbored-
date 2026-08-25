import { useState } from "react";
import { AlertTriangle, ArrowDown, CheckCircle2, Circle, FileDown, FileText, RefreshCw } from "lucide-react";
import clsx from "clsx";
import Card, { CardHeader } from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import ProgressBar from "../components/ui/ProgressBar";
import FileAttach, { type AttachedFileMeta } from "../components/FileAttach";
import { proposalSections, researchGap, studyAim, teamMembers, projectMeta } from "../data/mockData";
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

export default function Proposal() {
  const memberById = (id: string) => teamMembers.find((m) => m.id === id)!;
  const doneCount = proposalSections.filter((s) => s.status === "done").length;
  const completionPct = Math.round((doneCount / proposalSections.length) * 100);
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
          {projectMeta.name}
        </h1>
        <p className="mt-1 text-sm text-brand-950/60" dir="ltr">
          {projectMeta.subtitle}
        </p>
        <p className="mt-3 text-xs text-brand-950/45">
          تم التصدير بتاريخ {formatDateLong(new Date().toISOString().slice(0, 10))} — NURSYNC
        </p>
        <div className="my-4 border-t border-brand-200" />
      </div>

      <Card tone="cream" className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="font-display text-base font-bold text-brand-950">
            المقترح البحثي <span className="text-brand-950/40">— Research Proposal</span>
          </h2>
          <p className="mt-1 text-sm text-brand-950/50">
            {doneCount} من {proposalSections.length} أقسام مكتملة
          </p>
        </div>
        <div className="w-full max-w-xs shrink grow">
          <ProgressBar value={completionPct} />
        </div>
        <button
          onClick={() => window.print()}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
        >
          <FileDown size={16} />
          تصدير PDF
        </button>
      </Card>

      {/* Proposal Progress checklist */}
      <Card className="print:break-inside-avoid">
        <CardHeader title="مكونات المقترح البحثي" subtitle="Proposal Components" />
        <ul className="divide-y divide-brand-50">
          {proposalSections.map((section) => {
            const owner = memberById(section.ownerId);
            return (
              <li key={section.key} className="flex items-center gap-3 py-3">
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
                <Avatar initials={owner.initials} color={owner.color} size="sm" />
                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${statusChip[section.status]}`}
                >
                  {statusLabel[section.status]}
                </span>
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
            <ul className="space-y-1.5">
              {researchGap.whatWeKnow.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-brand-950/70">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-paper p-4">
            <p className="mb-2 text-sm font-bold text-brand-950">ما لا نعرفه</p>
            <ul className="space-y-1.5">
              {researchGap.whatWeDontKnow.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-brand-950/70">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="my-3 flex justify-center">
          <ArrowDown size={18} className="text-amber-accent-600" />
        </div>

        <div className="rounded-2xl border-2 border-amber-accent-400 bg-paper p-4">
          <p className="mb-1.5 text-sm font-bold text-amber-accent-700">الفجوة البحثية — Research Gap</p>
          <p className="text-sm text-brand-950/80">{researchGap.gapStatement}</p>
        </div>

        <div className="my-3 flex justify-center">
          <ArrowDown size={18} className="text-amber-accent-600" />
        </div>

        <div className="rounded-2xl bg-paper p-4">
          <p className="mb-1.5 text-sm font-bold text-brand-950">ما ستدرسه — Your Study</p>
          <p className="text-sm text-brand-950/80">{researchGap.studyConnection}</p>
        </div>

        {!researchGap.connectsToAim && (
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

        <div className="mb-5 flex items-center justify-center gap-3 text-xs font-bold">
          <span className="rounded-full bg-amber-accent-100 px-3 py-1.5 text-amber-accent-700">
            الفجوة البحثية
          </span>
          <ArrowDown className="-rotate-90 text-brand-950/25" size={16} />
          <span
            className={clsx(
              "rounded-full px-3 py-1.5",
              studyAim.status === "not-started"
                ? "bg-surface-muted text-brand-950/40"
                : "bg-brand-100 text-brand-700",
            )}
          >
            هدف الدراسة
          </span>
          <ArrowDown className="-rotate-90 text-brand-950/25" size={16} />
          <span
            className={clsx(
              "rounded-full px-3 py-1.5",
              studyAim.questions.length === 0
                ? "bg-surface-muted text-brand-950/40"
                : "bg-brand-100 text-brand-700",
            )}
          >
            أسئلة البحث
          </span>
        </div>

        <div className="rounded-2xl bg-surface-muted p-4">
          <p className="mb-1.5 text-sm font-bold text-brand-950">هدف الدراسة — Purpose / Aim</p>
          {studyAim.statement ? (
            <p className="text-sm text-brand-950/80">{studyAim.statement}</p>
          ) : (
            <p className="text-sm italic text-brand-950/40">
              لم تتم صياغته بعد — الخطوة التالية بعد إغلاق الفجوة البحثية.
            </p>
          )}
        </div>

        <div className="mt-3 rounded-2xl bg-surface-muted p-4">
          <p className="mb-1.5 text-sm font-bold text-brand-950">أسئلة البحث — Research Questions</p>
          {studyAim.questions.length > 0 ? (
            <ol className="space-y-1.5">
              {studyAim.questions.map((q) => (
                <li key={q.id} className="flex gap-2 text-sm text-brand-950/80">
                  <span className="font-bold text-brand-600">{q.order}.</span>
                  {q.text}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm italic text-brand-950/40">
              لم تتم صياغتها بعد — تُشتق مباشرة من هدف الدراسة.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
