import type { Paragraph, Table } from "docx";
import type { EthicalApproval, EthicalPrincipleAnswer } from "../data/types";
import { formatDateLong } from "./date";
import { loadWesyncKit, type WordStyle } from "./wordTheme";
import { tr } from "./i18n";

export interface EthicalApprovalExportInput {
  projectTitle: string;
  aim: string;
  design: string;
  setting: string;
  ethicalApproval: EthicalApproval;
}

const answerLabel: Record<Exclude<EthicalPrincipleAnswer, null>, string> = {
  yes: tr("نعم"),
  no: tr("لا"),
  na: tr("لا ينطبق"),
};

const principleLabels: { key: keyof EthicalApproval["principles"]; text: string }[] = [
  { key: "writtenExplanation", text: tr("شرح مكتوب عن البحث") },
  { key: "oralExplanation", text: tr("شرح شفهي عن البحث") },
  { key: "writtenConsent", text: tr("توقيع نموذج موافقة") },
  { key: "oralConsent", text: tr("موافقة شفهية") },
  { key: "voluntaryInformed", text: tr("إبلاغهم أن المشاركة اختيارية") },
  { key: "withdrawOption", text: tr("فرصة الانسحاب بأي وقت دون سبب") },
  { key: "harmInformed", text: tr("إبلاغهم بأي ضرر محتمل") },
  { key: "confidentialityGuaranteed", text: tr("ضمان السرية") },
  { key: "anonymityGuaranteed", text: tr("ضمان إخفاء الهوية") },
  { key: "vulnerableGroupsInformed", text: tr("إبلاغ الفئات المستضعفة بإمكانية تجاوز الأسئلة") },
  { key: "interviewNoExplanationNeeded", text: tr("عدم إلزام المشاركين بتفسير عدم الإجابة بالمقابلات") },
  { key: "safeDataStorage", text: tr("تأمين تخزين آمن للبيانات") },
  { key: "willPublish", text: tr("نشر نتائج البحث") },
];

const attachmentLabels: { key: keyof EthicalApproval["attachments"]; text: string }[] = [
  { key: "protocolOrProposal", text: tr("المقترح البحثي (Protocol)") },
  { key: "participantInfoSheet", text: tr("ورقة معلومات المشارك") },
  { key: "consentForm", text: tr("نموذج الموافقة") },
  { key: "studyTools", text: tr("أداة الدراسة") },
  { key: "otherSupportiveDocs", text: tr("مستندات داعمة أخرى") },
];

/** يبني نموذج طلب الموافقة الأخلاقية الحقيقي (.docx) بنفس ترتيب وحقول
    نموذج KAU الرسمي بالضبط — نفس أسلوب buildProposalWordDoc بـ wordExport.ts،
    بخط Times New Roman حجم ١٢ وتباعد سطر ١.٥ (يطابق معيار التنسيق بالروبريك) */
async function buildEthicalOfficial(input: EthicalApprovalExportInput): Promise<Blob> {
  const { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
  const { ethicalApproval: ea } = input;

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

  function arHeading(text: string) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 280, after: 140 },
      children: [new TextRun({ text, rightToLeft: true })],
    });
  }

  function field(label: string, value: string) {
    return ar(`${label}: ${value || "—"}`);
  }

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
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: "King Abdulaziz University — Faculty of Nursing",
                bold: true,
                size: 22,
                rightToLeft: true,
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 240 },
            children: [
              new TextRun({ text: tr("طلب الموافقة الأخلاقية — Application for Nursing Research Ethical Approval"), bold: true, rightToLeft: true }),
            ],
          }),

          arHeading(tr("Section One — بيانات الطلب")),
          field(tr("تاريخ الطلب"), ea.applicationDate ? formatDateLong(ea.applicationDate) : ""),
          field(tr("عنوان الدراسة"), input.projectTitle),
          field(tr("هدف الدراسة"), input.aim),
          field(tr("اسم الباحث الرئيسي"), ea.piName),
          field(tr("جهة الباحث الرئيسي"), ea.piAffiliation),
          field(tr("بريد الباحث الرئيسي"), ea.piEmail),
          field(
            tr("نوع الباحث الرئيسي"),
            ea.piType === "faculty" ? tr("عضو هيئة تدريس") : ea.piType === "graduate" ? tr("طالب دراسات عليا") : tr("طالب بكالوريوس"),
          ),
          ar(tr("باحثون آخرون:"), { bold: true }),
          ...(ea.otherResearchers ? ea.otherResearchers.split("\n").filter(Boolean).map((l) => ar(l)) : [ar(tr("لا يوجد"), { color: "999999" })]),
          field(tr("المشرف الأكاديمي"), ea.supervisorNames),
          field(tr("الرقم الجامعي"), ea.registrationNo),
          field(tr("تاريخ البدء المتوقع"), ea.expectedStartDate ? formatDateLong(ea.expectedStartDate) : ""),
          field(tr("تاريخ الانتهاء المتوقع"), ea.expectedEndDate ? formatDateLong(ea.expectedEndDate) : ""),
          field(tr("التصميم"), input.design),
          field(tr("مكان الدراسة"), input.setting),
          field(tr("الأشخاص المشاركون بإجراء الدراسة"), ea.personsInvolved),
          field(tr("إدارة البيانات وسريتها"), ea.dataManagementConfidentiality),
          field(tr("تفاصيل التمويل"), ea.fundingDetails),

          arHeading(tr("Section Two — المبادئ الأخلاقية")),
          ...principleLabels.map((p) => field(p.text, ea.principles[p.key] ? answerLabel[ea.principles[p.key] as Exclude<EthicalPrincipleAnswer, null>] : tr("لم يُحدد"))),

          arHeading(tr("Section Three — المرفقات")),
          ...attachmentLabels.map((a) => field(a.text, ea.attachments[a.key] ? tr("مرفق") : tr("غير مرفق"))),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

/** نسخة Wesync الداكنة: نفس الأقسام والحقول بالضبط، بجداول مقروءة. النموذج الرسمي
    للتقديم للجنة يبقى بنسخة "official" (أبيض بنسق KAU) */
async function buildEthicalDark(input: EthicalApprovalExportInput): Promise<Blob> {
  const { ethicalApproval: ea } = input;
  const k = await loadWesyncKit({ label: tr("طلب الموافقة الأخلاقية — Ethical Approval"), title: tr("طلب الموافقة الأخلاقية") });
  const piType =
    ea.piType === "faculty" ? tr("عضو هيئة تدريس") : ea.piType === "graduate" ? tr("طالب دراسات عليا") : tr("طالب بكالوريوس");
  const others = ea.otherResearchers ? ea.otherResearchers.split("\n").filter(Boolean).join(tr("، ")) : "";
  const date = (d: string | null | undefined) => (d ? formatDateLong(d) : "");

  const children: (Paragraph | Table)[] = [
    ...k.masthead({
      kicker: tr("ETHICAL APPROVAL — طلب موافقة أخلاقية"),
      title: tr("طلب الموافقة الأخلاقية"),
      sub: "Application for Nursing Research Ethical Approval — King Abdulaziz University, Faculty of Nursing",
    }),

    k.heading(tr("بيانات الطلب — Section One"), tr("١")),
    k.card([
      [tr("تاريخ الطلب"), date(ea.applicationDate)],
      [tr("عنوان الدراسة"), input.projectTitle],
      [tr("هدف الدراسة"), input.aim],
      [tr("اسم الباحث الرئيسي"), ea.piName],
      [tr("جهة الباحث الرئيسي"), ea.piAffiliation],
      [tr("بريد الباحث الرئيسي"), ea.piEmail],
      [tr("نوع الباحث الرئيسي"), piType],
      [tr("باحثون آخرون"), others],
      [tr("المشرف الأكاديمي"), ea.supervisorNames],
      [tr("الرقم الجامعي"), ea.registrationNo],
      [tr("تاريخ البدء المتوقع"), date(ea.expectedStartDate)],
      [tr("تاريخ الانتهاء المتوقع"), date(ea.expectedEndDate)],
      [tr("التصميم"), input.design],
      [tr("مكان الدراسة"), input.setting],
      [tr("الأشخاص المشاركون بإجراء الدراسة"), ea.personsInvolved],
      [tr("إدارة البيانات وسريتها"), ea.dataManagementConfidentiality],
      [tr("تفاصيل التمويل"), ea.fundingDetails],
    ]),

    k.heading(tr("المبادئ الأخلاقية — Section Two"), tr("٢")),
    k.card(
      principleLabels.map((p) => [
        p.text,
        ea.principles[p.key] ? answerLabel[ea.principles[p.key] as Exclude<EthicalPrincipleAnswer, null>] : tr("لم يُحدد"),
      ]),
      { labelWidth: 68 },
    ),

    k.heading(tr("المرفقات — Section Three"), tr("٣")),
    k.card(
      attachmentLabels.map((a) => [a.text, ea.attachments[a.key] ? tr("مرفق") : tr("غير مرفق")]),
      { labelWidth: 68 },
    ),
  ];
  return k.build(children);
}

/** style: "dark" (الافتراضي، هوية Wesync) أو "official" (نسق KAU الرسمي للتقديم) */
export function buildEthicalApprovalDoc(input: EthicalApprovalExportInput, style: WordStyle = "dark"): Promise<Blob> {
  return style === "official" ? buildEthicalOfficial(input) : buildEthicalDark(input);
}
