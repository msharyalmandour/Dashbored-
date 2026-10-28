import type { Paragraph, Table } from "docx";
import type { EvidencePaper, Methodology, ProposalSectionRow, ResearchGap, ResearchQuestion, StudyAim } from "../data/types";
import { buildReferenceList } from "./citation";
import { formatDateLongEn } from "./date";
import { C, loadWesyncKit, type WordStyle } from "./wordTheme";
import { tre } from "./i18n";

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
async function buildProposalOfficial(input: WordExportInput): Promise<Blob> {
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
    return text.trim() ? ar(text) : ar(tre("لم يُكتب بعد."), { color: "999999" });
  }

  function fieldBlock(label: string, value: string) {
    return [ar(label, { bold: true, size: 22 }), narrative(value)];
  }

  function listBlock(label: string, items: string[]) {
    if (items.length === 0) {
      return [ar(label, { bold: true, size: 22 }), ar(tre("لم تُحدد بعد"), { color: "999999" })];
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
          run: { font: { ascii: "Times New Roman", hAnsi: "Times New Roman", cs: "Arial", eastAsia: "Arial" }, size: 24 },
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
                text: tre("Wesync — المقترح البحثي"),
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
              new TextRun({ text: tre("الفريق البحثي: {0}", input.teamNames.join(tre("، "))), size: 20, rightToLeft: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: tre("المشرف الأكاديمي: {0}", input.supervisorName || "—"),
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
                text: tre("تم إنشاء هذه النسخة بتاريخ {0}", formatDateLongEn(new Date().toISOString().slice(0, 10))),
                size: 18,
                color: "666666",
                rightToLeft: true,
              }),
            ],
          }),

          // الملخص — Abstract
          arHeading(tre("الملخص — Abstract"), HeadingLevel.HEADING_1),
          narrative(input.abstract),

          // ١. الخلفية ومراجعة الأدبيات
          arHeading(tre("١. الخلفية ومراجعة الأدبيات — Background and Literature Review"), HeadingLevel.HEADING_1),
          narrative(sectionContent(input.sections, "background")),
          narrative(sectionContent(input.sections, "literature-review")),

          // ٢. مشكلة البحث (مع الفجوة البحثية)
          arHeading(tre("٢. مشكلة البحث — Statement of Problem"), HeadingLevel.HEADING_1),
          narrative(sectionContent(input.sections, "problem")),
          ...(input.researchGap.gapStatement.trim()
            ? [ar(tre("الفجوة البحثية:"), { bold: true, size: 22 }), narrative(input.researchGap.gapStatement)]
            : []),

          // ٣. هدف الدراسة
          arHeading(tre("٣. هدف الدراسة — Purpose of the Study"), HeadingLevel.HEADING_1),
          narrative(input.studyAim.statement),

          // ٤. سؤال البحث
          arHeading(tre("٤. سؤال البحث — Research Question"), HeadingLevel.HEADING_1),
          ...(input.researchQuestions.length > 0
            ? input.researchQuestions.map((q) => ar(`${q.order}. ${q.text}`))
            : [ar(tre("لم تتم صياغتها بعد."), { color: "999999" })]),

          // ٥. المنهجية
          arHeading(tre("٥. المنهجية — Methods"), HeadingLevel.HEADING_1),
          ...fieldBlock(tre("أ. تصميم الدراسة — Design"), input.methodology.studyDesign),
          ...fieldBlock(tre("ب. مكان الدراسة — Setting"), input.methodology.studySetting),
          ...fieldBlock(tre("مجتمع الدراسة — Population"), input.methodology.population),
          ...listBlock(tre("ج. معايير الاشتمال — Inclusion Criteria"), input.methodology.sampling.inclusionCriteria),
          ...listBlock(tre("معايير الاستبعاد — Exclusion Criteria"), input.methodology.sampling.exclusionCriteria),
          ...fieldBlock(tre("حجم العينة — Sample Size"), input.methodology.sampling.sampleSize),
          ...fieldBlock(tre("أسلوب اختيار العينة — Sampling Technique"), input.methodology.sampling.samplingTechnique),
          ...listBlock(tre("د. طريقة/أداة جمع البيانات — Data Collection Method/Tool"), input.methodology.dataCollectionMethods),
          ...fieldBlock(tre("هـ. إجراء جمع البيانات — Data Collection Procedure"), input.methodology.dataCollectionProcedure),
          ...fieldBlock(tre("و. تحليل البيانات — Data Analysis"), input.methodology.dataAnalysis),
          ...fieldBlock(tre("ز. الاعتبارات الأخلاقية — Ethical Considerations"), input.methodology.ethicalConsiderations),

          // قائمة المراجع
          arHeading(tre("قائمة المراجع (APA) — References — {0}", input.evidenceLibrary.length), HeadingLevel.HEADING_1),
          ...(references.length > 0
            ? references.map((ref) => enParagraph(ref))
            : [ar(tre("لم تُضَف مراجع بعد."), { color: "999999" })]),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

/** نسخة Wesync الداكنة: غلاف، خلفية سوداء دافئة، عناوين برتقالية، ترويسة وتذييل
    برقم الصفحة. للقراءة على الشاشة والعرض على المشرفة — للتسليم والطباعة
    استخدموا النسخة الرسمية (style: "official"). */
async function buildProposalDark(input: WordExportInput): Promise<Blob> {
  const k = await loadWesyncKit({ label: tre("المقترح البحثي — Research Proposal"), title: input.projectTitle || tre("المقترح البحثي") });
  const dateLine = formatDateLongEn(new Date().toISOString().slice(0, 10));
  const references = buildReferenceList(input.evidenceLibrary, "apa").split("\n\n").filter(Boolean);
  const gap = input.researchGap.gapStatement.trim();
  const children: (Paragraph | Table)[] = [
    ...k.cover({
      kicker: tre("المقترح البحثي — RESEARCH PROPOSAL"),
      title: input.projectTitle || tre("بدون عنوان بعد"),
      meta: [
        [tre("الفريق البحثي"), input.teamNames.join(tre("، "))],
        [tre("المشرف الأكاديمي"), input.supervisorName],
        [tre("تاريخ النسخة"), dateLine],
      ],
      note: tre("أُنشئ بواسطة Wesync — منصة إدارة أبحاث التخرج التمريضي"),
    }),

    k.heading(tre("الملخص — Abstract")),
    ...k.narrative(input.abstract),

    k.heading(tre("الخلفية ومراجعة الأدبيات — Background and Literature Review"), tre("١")),
    ...k.narrative(sectionContent(input.sections, "background")),
    ...k.narrative(sectionContent(input.sections, "literature-review")),

    k.heading(tre("مشكلة البحث — Statement of Problem"), tre("٢")),
    ...k.narrative(sectionContent(input.sections, "problem")),
    ...(gap ? [k.para([k.run("")], { after: 60 }), k.callout(tre("الفجوة البحثية — Research Gap"), gap)] : []),

    k.heading(tre("هدف الدراسة — Purpose of the Study"), tre("٣")),
    ...k.narrative(input.studyAim.statement),

    k.heading(tre("سؤال البحث — Research Question"), tre("٤")),
    ...(input.researchQuestions.length > 0
      ? input.researchQuestions.map((q) => k.para([k.run(`${q.order}.  `, { bold: true, color: C.ember }), k.run(q.text)]))
      : k.empty(tre("لم تتم صياغتها بعد."))),

    k.heading(tre("المنهجية — Methods"), tre("٥")),
    k.label(tre("أ. تصميم الدراسة — Design")),
    ...k.narrative(input.methodology.studyDesign),
    k.label(tre("ب. مكان الدراسة — Setting")),
    ...k.narrative(input.methodology.studySetting),
    k.label(tre("مجتمع الدراسة — Population")),
    ...k.narrative(input.methodology.population),
    k.label(tre("ج. معايير الاشتمال — Inclusion Criteria")),
    ...k.bullets(input.methodology.sampling.inclusionCriteria),
    k.label(tre("معايير الاستبعاد — Exclusion Criteria")),
    ...k.bullets(input.methodology.sampling.exclusionCriteria),
    k.label(tre("حجم العينة — Sample Size")),
    ...k.narrative(input.methodology.sampling.sampleSize),
    k.label(tre("أسلوب اختيار العينة — Sampling Technique")),
    ...k.narrative(input.methodology.sampling.samplingTechnique),
    k.label(tre("د. طريقة/أداة جمع البيانات — Data Collection Method/Tool")),
    ...k.bullets(input.methodology.dataCollectionMethods),
    k.label(tre("هـ. إجراء جمع البيانات — Data Collection Procedure")),
    ...k.narrative(input.methodology.dataCollectionProcedure),
    k.label(tre("و. تحليل البيانات — Data Analysis")),
    ...k.narrative(input.methodology.dataAnalysis),
    k.label(tre("ز. الاعتبارات الأخلاقية — Ethical Considerations")),
    ...k.narrative(input.methodology.ethicalConsiderations),

    k.heading(tre("قائمة المراجع (APA) — References ({0})", input.evidenceLibrary.length)),
    ...(references.length > 0 ? references.map((r) => k.latin(r)) : k.empty(tre("لم تُضَف مراجع بعد."))),
  ];
  return k.build(children, { hasCover: true });
}

/** style: "dark" (الافتراضي، هوية Wesync) أو "official" (أبيض بنسق الروبريك الرسمي للتسليم) */
export function buildProposalWordDoc(input: WordExportInput, style: WordStyle = "dark"): Promise<Blob> {
  return style === "official" ? buildProposalOfficial(input) : buildProposalDark(input);
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
