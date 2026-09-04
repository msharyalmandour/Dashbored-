import type { EvidencePaper, Methodology, ProposalSection, ResearchGap, StudyAim } from "../data/types";
import { buildReferenceList } from "./citation";
import { formatDateLong } from "./date";

const statusLabelAr: Record<ProposalSection["status"], string> = {
  done: "مكتمل",
  "in-progress": "قيد العمل",
  "not-started": "لم يبدأ",
};

export interface WordExportInput {
  projectName: string;
  projectSubtitle: string;
  teamNames: string[];
  proposalSections: ProposalSection[];
  researchGap: ResearchGap;
  studyAim: StudyAim;
  methodology: Methodology;
  evidenceLibrary: EvidencePaper[];
}

/** يبني وثيقة Word حقيقية (.docx) من بيانات المقترح البحثي كاملة — ملف
    قابل للتعديل الكامل بوورد (خلاف تصدير PDF اللي مجرد طباعة ثابتة)،
    عشان المشرفة تقدر تعلّق وتعدّل وتتبّع التغييرات مباشرة.
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

  function fieldBlock(label: string, value: string) {
    return [ar(label, { bold: true, size: 22 }), ar(value || "لم يُحدد بعد", { color: value ? undefined : "999999" })];
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
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            bidirectional: true,
            children: [
              new TextRun({
                text: "StudySync — الوثيقة البحثية الكاملة",
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
            spacing: { after: 80 },
            children: [new TextRun({ text: input.projectName, bold: true, rightToLeft: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: input.projectSubtitle, italics: true })],
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

          arHeading("١. مكونات المقترح البحثي", HeadingLevel.HEADING_1),
          ...input.proposalSections.map((s) =>
            ar(`${s.labelAr} (${s.labelEn}) — ${statusLabelAr[s.status]}`),
          ),

          arHeading("الفجوة البحثية", HeadingLevel.HEADING_2),
          ar("ما نعرفه", { bold: true, size: 22 }),
          ...input.researchGap.whatWeKnow.map((t) => arBullet(t)),
          ar("ما لا نعرفه", { bold: true, size: 22 }),
          ...input.researchGap.whatWeDontKnow.map((t) => arBullet(t)),
          ar("الفجوة البحثية", { bold: true, size: 22 }),
          ar(input.researchGap.gapStatement),
          ar("ما ستدرسه", { bold: true, size: 22 }),
          ar(input.researchGap.studyConnection),

          arHeading("هدف الدراسة وأسئلة البحث", HeadingLevel.HEADING_2),
          ar("هدف الدراسة", { bold: true, size: 22 }),
          ar(input.studyAim.statement || "لم تتم صياغته بعد.", {
            color: input.studyAim.statement ? undefined : "999999",
          }),
          ar("أسئلة البحث", { bold: true, size: 22 }),
          ...(input.studyAim.questions.length > 0
            ? input.studyAim.questions.map((q) => ar(`${q.order}. ${q.text}`))
            : [ar("لم تتم صياغتها بعد.", { color: "999999" })]),

          arHeading("٢. المنهجية", HeadingLevel.HEADING_1),
          ...fieldBlock("نوع التصميم (كمي / كيفي / مختلط)", input.methodology.studyDesign),
          ...fieldBlock("مكان الدراسة", input.methodology.studySetting),
          ...fieldBlock("مجتمع الدراسة", input.methodology.population),

          arHeading("العينة", HeadingLevel.HEADING_2),
          ...listBlock("معايير الاشتمال", input.methodology.sampling.inclusionCriteria),
          ...listBlock("معايير الاستبعاد", input.methodology.sampling.exclusionCriteria),
          ...fieldBlock("حجم العينة", input.methodology.sampling.sampleSize),
          ...fieldBlock("أسلوب اختيار العينة", input.methodology.sampling.samplingTechnique),

          arHeading("جمع البيانات", HeadingLevel.HEADING_2),
          ...listBlock("طريقة الجمع", input.methodology.dataCollectionMethods),

          arHeading(`٣. قائمة المراجع (APA) — ${input.evidenceLibrary.length}`, HeadingLevel.HEADING_1),
          ...references.map((ref) => enParagraph(ref)),
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
