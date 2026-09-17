import type { EvidencePaper, Methodology, ProposalSectionRow, ResearchGap, ResearchQuestion, StudyAim } from "../data/types";
import { buildReferenceList } from "./citation";
import { formatDateLong } from "./date";

export interface WordExportInput {
  projectTitle: string;
  abstract: string;
  supervisorName: string;
  teamNames: string[];
  sections: ProposalSectionRow[];
  researchGap: ResearchGap;
  studyAim: StudyAim;
  researchQuestions: ResearchQuestion[];
  methodology: Methodology;
  evidenceLibrary: EvidencePaper[];
}

function sectionContent(sections: ProposalSectionRow[], key: ProposalSectionRow["key"]): string {
  return sections.find((s) => s.key === key)?.content ?? "";
}

/** يبني وثيقة Word حقيقية (.docx) من بيانات المقترح البحثي كاملة، بنفس
    ترتيب وعناوين نموذج المقترح الرسمي لكلية التمريض بالضبط (غلاف → ملخص →
    ١.الخلفية ومراجعة الأدبيات → ٢.مشكلة البحث → ٣.هدف الدراسة → ٤.سؤال
    البحث → ٥.المنهجية → قائمة المراجع) — ملف قابل للتعديل الكامل بوورد
    (خلاف تصدير PDF اللي مجرد طباعة ثابتة)، عشان المشرفة تقدر تعلّق وتعدّل
    وتتبّع التغييرات مباشرة.
    مكتبة docx ثقيلة (~350 كيلوبايت) ونادر إنها تُستخدم أصلاً، فنحمّلها
    ديناميكيًا هنا بس وقت الحاجة الفعلية — بدل ما تدخل حزمة التطبيق
    الرئيسية اللي تحمّل بكل صفحة */
export async function buildProposalWordDoc(input: WordExportInput): Promise<Blob> {
  const { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");

  function ar(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) {
    return new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { after: 120 },
      children: [
        new TextRun({ text, bold: opts.bold, size: opts.size, color: opts.color, rightToLeft: true }),
      ],
    });
  }

  function arHeading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
    return new Paragraph({
      heading: level,
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 320, after: 160 },
      children: [new TextRun({ text, rightToLeft: true })],
    });
  }

  function arBullet(text: string) {
    return new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      bullet: { level: 0 },
      spacing: { after: 80 },
      children: [new TextRun({ text, rightToLeft: true })],
    });
  }

  function enParagraph(text: string) {
    return new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 160 },
      children: [new TextRun({ text })],
    });
  }

  function narrative(text: string) {
    return text.trim() ? ar(text) : ar("لم يُكتب بعد.", { color: "999999" });
  }

  function fieldBlock(label: string, value: string) {
    return [ar(label, { bold: true, size: 22 }), narrative(value)];
  }

  function listBlock(label: string, items: string[]) {
    if (items.length === 0) {
      return [ar(label, { bold: true, size: 22 }), ar("لم تُحدد بعد", { color: "999999" })];
    }
    return [ar(label, { bold: true, size: 22 }), ...items.map((item) => arBullet(item))];
  }

  const references = buildReferenceList(input.evidenceLibrary, "apa")
    .split("\n\n")
    .filter(Boolean);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 24 },
          paragraph: { spacing: { line: 360, lineRule: "auto" } },
        },
      },
    },
    sections: [
      {
        properties: {},
        children: [
          // غلاف الوثيقة — Title Page
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            bidirectional: true,
            children: [
              new TextRun({
                text: "Wesync — المقترح البحثي",
                bold: true,
                size: 20,
                color: "8a6d1a",
                rightToLeft: true,
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 200 },
            children: [new TextRun({ text: input.projectTitle, bold: true, rightToLeft: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 60 },
            children: [
              new TextRun({ text: `الفريق البحثي: ${input.teamNames.join("، ")}`, size: 20, rightToLeft: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: `المشرف الأكاديمي: ${input.supervisorName || "—"}`,
                size: 20,
                rightToLeft: true,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: `تم إنشاء هذه النسخة بتاريخ ${formatDateLong(new Date().toISOString().slice(0, 10))}`,
                size: 18,
                color: "666666",
                rightToLeft: true,
              }),
            ],
          }),

          // الملخص — Abstract
          arHeading("الملخص — Abstract", HeadingLevel.HEADING_1),
          narrative(input.abstract),

          // ١. الخلفية ومراجعة الأدبيات
          arHeading("١. الخلفية ومراجعة الأدبيات — Background and Literature Review", HeadingLevel.HEADING_1),
          narrative(sectionContent(input.sections, "background")),
          narrative(sectionContent(input.sections, "literature-review")),

          // ٢. مشكلة البحث (مع الفجوة البحثية)
          arHeading("٢. مشكلة البحث — Statement of Problem", HeadingLevel.HEADING_1),
          narrative(sectionContent(input.sections, "problem")),
          ...(input.researchGap.gapStatement.trim()
            ? [ar("الفجوة البحثية:", { bold: true, size: 22 }), narrative(input.researchGap.gapStatement)]
            : []),

          // ٣. هدف الدراسة
          arHeading("٣. هدف الدراسة — Purpose of the Study", HeadingLevel.HEADING_1),
          narrative(input.studyAim.statement),

          // ٤. سؤال البحث
          arHeading("٤. سؤال البحث — Research Question", HeadingLevel.HEADING_1),
          ...(input.researchQuestions.length > 0
            ? input.researchQuestions.map((q) => ar(`${q.order}. ${q.text}`))
            : [ar("لم تتم صياغتها بعد.", { color: "999999" })]),

          // ٥. المنهجية
          arHeading("٥. المنهجية — Methods", HeadingLevel.HEADING_1),
          ...fieldBlock("أ. تصميم الدراسة — Design", input.methodology.studyDesign),
          ...fieldBlock("ب. مكان الدراسة — Setting", input.methodology.studySetting),
          ...fieldBlock("مجتمع الدراسة — Population", input.methodology.population),
          ...listBlock("ج. معايير الاشتمال — Inclusion Criteria", input.methodology.sampling.inclusionCriteria),
          ...listBlock("معايير الاستبعاد — Exclusion Criteria", input.methodology.sampling.exclusionCriteria),
          ...fieldBlock("حجم العينة — Sample Size", input.methodology.sampling.sampleSize),
          ...fieldBlock("أسلوب اختيار العينة — Sampling Technique", input.methodology.sampling.samplingTechnique),
          ...listBlock("د. طريقة/أداة جمع البيانات — Data Collection Method/Tool", input.methodology.dataCollectionMethods),
          ...fieldBlock("هـ. إجراء جمع البيانات — Data Collection Procedure", input.methodology.dataCollectionProcedure),
          ...fieldBlock("و. تحليل البيانات — Data Analysis", input.methodology.dataAnalysis),
          ...fieldBlock("ز. الاعتبارات الأخلاقية — Ethical Considerations", input.methodology.ethicalConsiderations),

          // قائمة المراجع
          arHeading(`قائمة المراجع (APA) — References — ${input.evidenceLibrary.length}`, HeadingLevel.HEADING_1),
          ...(references.length > 0
            ? references.map((ref) => enParagraph(ref))
            : [ar("لم تُضَف مراجع بعد.", { color: "999999" })]),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function downloadWordDoc(blob: Blob, filename = "nursync-proposal.docx") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
