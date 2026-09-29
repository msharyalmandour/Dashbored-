import { useState } from "react";
import { Link } from "react-router-dom";
import { FileDown, FileType2, Loader2, ArrowRight } from "lucide-react";
import Card, { CardHeader } from "../components/ui/Card";
import { useResearchProject } from "../hooks/useResearchProject";
import { useProposal } from "../hooks/useProposal";
import { useMethodology } from "../hooks/useMethodology";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import { buildReferenceList } from "../lib/citation";
import { formatDateLong } from "../lib/date";
import { buildProposalWordDoc, downloadWordDoc } from "../lib/wordExport";

function sectionContent(sections: { key: string; content: string }[], key: string): string {
  return sections.find((s) => s.key === key)?.content ?? "";
}

function Narrative({ text }: { text: string }) {
  return text.trim() ? (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-950/80">{text}</p>
  ) : (
    <p className="text-sm italic text-brand-950/35">لم يُكتب بعد.</p>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-muted p-4">
      <p className="text-xs font-bold text-brand-950/45">{label}</p>
      {value ? (
        <p className="mt-1 text-sm font-semibold text-brand-950">{value}</p>
      ) : (
        <p className="mt-1 text-sm italic text-brand-950/35">لم يُحدد بعد</p>
      )}
    </div>
  );
}

function ListField({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-surface-muted p-4">
      <p className="text-xs font-bold text-brand-950/45">{label}</p>
      {items.length > 0 ? (
        <ul className="mt-1.5 space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-brand-950/75">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm italic text-brand-950/35">لم تُحدد بعد</p>
      )}
    </div>
  );
}

export default function FullDocumentExport() {
  const { project } = useResearchProject();
  const { sections, gap, aim, questions } = useProposal();
  const { methodology } = useMethodology();
  const { roster } = useTeamRoster();
  const { papers } = useEvidencePapers();

  const references = buildReferenceList(papers, "apa").split("\n\n").filter(Boolean);
  const [exportingWord, setExportingWord] = useState(false);

  const exportWord = async () => {
    setExportingWord(true);
    try {
      const blob = await buildProposalWordDoc({
        projectTitle: project?.title ?? "",
        abstract: project?.abstract ?? "",
        supervisorName: project?.supervisorName ?? "",
        teamNames: roster.map((m) => m.name),
        sections,
        researchGap: gap,
        studyAim: aim,
        researchQuestions: questions,
        methodology,
        evidenceLibrary: papers,
      });
      downloadWordDoc(blob, `${project?.title || "المقترح البحثي"}.docx`);
    } finally {
      setExportingWord(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to="/proposal"
          className="flex items-center gap-1.5 text-sm font-semibold text-brand-950/50 hover:text-brand-700"
        >
          <ArrowRight size={16} />
          رجوع للمقترح
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={exportWord}
            disabled={exportingWord}
            className="flex items-center gap-2 rounded-xl border border-brand-200 bg-paper px-4 py-2.5 text-sm font-bold text-brand-950 hover:bg-surface-muted disabled:opacity-60"
          >
            {exportingWord ? <Loader2 size={16} className="animate-spin" /> : <FileType2 size={16} />}
            تصدير Word
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
          >
            <FileDown size={16} />
            تصدير PDF
          </button>
        </div>
      </div>

      {/* غلاف الوثيقة */}
      <Card tone="cream" className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-950/40">
          Wesync — المقترح البحثي
        </p>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-brand-950">
          {project?.title || "المقترح البحثي"}
        </h1>
        <p className="mt-4 text-xs text-brand-950/45">
          الفريق البحثي: {roster.map((m) => m.name).join("، ")}
        </p>
        <p className="mt-1 text-xs text-brand-950/45">المشرف الأكاديمي: {project?.supervisorName || "—"}</p>
        <p className="mt-1 text-xs text-brand-950/45">
          تم إنشاء هذه النسخة بتاريخ {formatDateLong(new Date().toISOString().slice(0, 10))}
        </p>
      </Card>

      {/* الملخص */}
      <Card className="print:break-inside-avoid">
        <CardHeader title="الملخص" subtitle="Abstract" />
        <Narrative text={project?.abstract ?? ""} />
      </Card>

      {/* ١. الخلفية ومراجعة الأدبيات */}
      <Card className="print:break-inside-avoid">
        <CardHeader title="١. الخلفية ومراجعة الأدبيات" subtitle="Background and Literature Review" />
        <div className="space-y-3">
          <Narrative text={sectionContent(sections, "background")} />
          <Narrative text={sectionContent(sections, "literature-review")} />
        </div>
      </Card>

      {/* ٢. مشكلة البحث */}
      <Card className="print:break-inside-avoid">
        <CardHeader title="٢. مشكلة البحث" subtitle="Statement of Problem" />
        <Narrative text={sectionContent(sections, "problem")} />
        {gap.gapStatement.trim() && (
          <div className="mt-3 rounded-2xl bg-amber-accent-50 p-4">
            <p className="mb-1.5 text-sm font-bold text-amber-accent-700">الفجوة البحثية — Research Gap</p>
            <Narrative text={gap.gapStatement} />
          </div>
        )}
      </Card>

      {/* ٣. هدف الدراسة */}
      <Card className="print:break-inside-avoid">
        <CardHeader title="٣. هدف الدراسة" subtitle="Purpose of the Study" />
        <Narrative text={aim.statement} />
      </Card>

      {/* ٤. سؤال البحث */}
      <Card className="print:break-inside-avoid">
        <CardHeader title="٤. سؤال البحث" subtitle="Research Question" />
        {questions.length > 0 ? (
          <ol className="space-y-1.5">
            {questions.map((q) => (
              <li key={q.id} className="flex gap-2 text-sm text-brand-950/80">
                <span className="font-bold text-brand-600">{q.order}.</span>
                {q.text}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm italic text-brand-950/40">لم تتم صياغتها بعد.</p>
        )}
      </Card>

      {/* ٥. المنهجية */}
      <div className="space-y-5 print:break-before-page">
        <Card className="print:break-inside-avoid">
          <CardHeader title="٥. المنهجية" subtitle="Methods" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="أ. تصميم الدراسة — Design" value={methodology.studyDesign} />
            <Field label="ب. مكان الدراسة — Setting" value={methodology.studySetting} />
          </div>
        </Card>

        <Card className="print:break-inside-avoid">
          <CardHeader title="العينة" subtitle="Sample & Sample Size" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="مجتمع الدراسة" value={methodology.population} />
            <Field label="حجم العينة" value={methodology.sampling.sampleSize} />
            <ListField label="معايير الاشتمال" items={methodology.sampling.inclusionCriteria} />
            <ListField label="معايير الاستبعاد" items={methodology.sampling.exclusionCriteria} />
            <Field label="أسلوب اختيار العينة" value={methodology.sampling.samplingTechnique} />
          </div>
        </Card>

        <Card className="print:break-inside-avoid">
          <CardHeader title="ج/د. جمع البيانات" subtitle="Data Collection Method/Tool" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ListField label="طريقة الجمع" items={methodology.dataCollectionMethods} />
            <Field label="إجراء جمع البيانات" value={methodology.dataCollectionProcedure} />
          </div>
        </Card>

        <Card className="print:break-inside-avoid">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="و. تحليل البيانات — Data Analysis" value={methodology.dataAnalysis} />
            <Field label="ز. الاعتبارات الأخلاقية — Ethical Considerations" value={methodology.ethicalConsiderations} />
          </div>
        </Card>
      </div>

      {/* قائمة المراجع */}
      <div className="print:break-before-page">
        <Card className="print:break-inside-avoid">
          <CardHeader title="قائمة المراجع" subtitle={`References — APA (${papers.length})`} />
          <div className="space-y-3">
            {references.length > 0 ? (
              references.map((ref, i) => (
                <p key={i} className="text-sm leading-relaxed text-brand-950/80" dir="ltr">
                  {ref}
                </p>
              ))
            ) : (
              <p className="text-sm italic text-brand-950/35">لم تُضَف مراجع بعد.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
