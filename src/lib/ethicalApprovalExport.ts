import type { Paragraph, Table } from "docx";
import type { EthicalApproval, EthicalPrincipleAnswer } from "../data/types";
import { formatDateLong } from "./date";
import { loadWesyncKit, type WordStyle } from "./wordTheme";

export interface EthicalApprovalExportInput {
  projectTitle: string;
  aim: string;
  design: string;
  setting: string;
  ethicalApproval: EthicalApproval;
}

const answerLabel: Record<Exclude<EthicalPrincipleAnswer, null>, string> = {
  yes: "نعم",
  no: "لا",
  na: "لا ينطبق",
};

const principleLabels: { key: keyof EthicalApproval["principles"]; text: string }[] = [
  { key: "writtenExplanation", text: "شرح مكتوب عن البحث" },
  { key: "oralExplanation", text: "شرح شفهي عن البحث" },
  { key: "writtenConsent", text: "توقيع نموذج موافقة" },
  { key: "oralConsent", text: "موافقة شفهية" },
  { key: "voluntaryInformed", text: "إبلاغهم أن المشاركة اختيارية" },
  { key: "withdrawOption", text: "فرصة الانسحاب بأي وقت دون سبب" },
  { key: "harmInformed", text: "إبلاغهم بأي ضرر محتمل" },
  { key: "confidentialityGuaranteed", text: "ضمان السرية" },
  { key: "anonymityGuaranteed", text: "ضمان إخفاء الهوية" },
  { key: "vulnerableGroupsInformed", text: "إبلاغ الفئات المستضعفة بإمكانية تجاوز الأسئلة" },
  { key: "interviewNoExplanationNeeded", text: "عدم إلزام المشاركين بتفسير عدم الإجابة بالمقابلات" },
  { key: "safeDataStorage", text: "تأمين تخزين آمن للبيانات" },
  { key: "willPublish", text: "نشر نتائج البحث" },
];

const attachmentLabels: { key: keyof EthicalApproval["attachments"]; text: string }[] = [
  { key: "protocolOrProposal", text: "المقترح البحثي (Protocol)" },
  { key: "participantInfoSheet", text: "ورقة معلومات المشارك" },
  { key: "consentForm", text: "نموذج الموافقة" },
  { key: "studyTools", text: "أداة الدراسة" },
  { key: "otherSupportiveDocs", text: "مستندات داعمة أخرى" },
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
              new TextRun({ text: "طلب الموافقة الأخلاقية — Application for Nursing Research Ethical Approval", bold: true, rightToLeft: true }),
            ],
          }),

          arHeading("Section One — بيانات الطلب"),
          field("تاريخ الطلب", ea.applicationDate ? formatDateLong(ea.applicationDate) : ""),
          field("عنوان الدراسة", input.projectTitle),
          field("هدف الدراسة", input.aim),
          field("اسم الباحث الرئيسي", ea.piName),
          field("جهة الباحث الرئيسي", ea.piAffiliation),
          field("بريد الباحث الرئيسي", ea.piEmail),
          field(
            "نوع الباحث الرئيسي",
            ea.piType === "faculty" ? "عضو هيئة تدريس" : ea.piType === "graduate" ? "طالب دراسات عليا" : "طالب بكالوريوس",
          ),
          ar("باحثون آخرون:", { bold: true }),
          ...(ea.otherResearchers ? ea.otherResearchers.split("\n").filter(Boolean).map((l) => ar(l)) : [ar("لا يوجد", { color: "999999" })]),
          field("المشرف الأكاديمي", ea.supervisorNames),
          field("الرقم الجامعي", ea.registrationNo),
          field("تاريخ البدء المتوقع", ea.expectedStartDate ? formatDateLong(ea.expectedStartDate) : ""),
          field("تاريخ الانتهاء المتوقع", ea.expectedEndDate ? formatDateLong(ea.expectedEndDate) : ""),
          field("التصميم", input.design),
          field("مكان الدراسة", input.setting),
          field("الأشخاص المشاركون بإجراء الدراسة", ea.personsInvolved),
          field("إدارة البيانات وسريتها", ea.dataManagementConfidentiality),
          field("تفاصيل التمويل", ea.fundingDetails),

          arHeading("Section Two — المبادئ الأخلاقية"),
          ...principleLabels.map((p) => field(p.text, ea.principles[p.key] ? answerLabel[ea.principles[p.key] as Exclude<EthicalPrincipleAnswer, null>] : "لم يُحدد")),

          arHeading("Section Three — المرفقات"),
          ...attachmentLabels.map((a) => field(a.text, ea.attachments[a.key] ? "مرفق" : "غير مرفق")),
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
  const k = await loadWesyncKit({ label: "طلب الموافقة الأخلاقية — Ethical Approval", title: "طلب الموافقة الأخلاقية" });
  const piType =
    ea.piType === "faculty" ? "عضو هيئة تدريس" : ea.piType === "graduate" ? "طالب دراسات عليا" : "طالب بكالوريوس";
  const others = ea.otherResearchers ? ea.otherResearchers.split("\n").filter(Boolean).join("، ") : "";
  const date = (d: string | null | undefined) => (d ? formatDateLong(d) : "");

  const children: (Paragraph | Table)[] = [
    ...k.masthead({
      kicker: "ETHICAL APPROVAL — طلب موافقة أخلاقية",
      title: "طلب الموافقة الأخلاقية",
      sub: "Application for Nursing Research Ethical Approval — King Abdulaziz University, Faculty of Nursing",
    }),

    k.heading("بيانات الطلب — Section One", "١"),
    k.card([
      ["تاريخ الطلب", date(ea.applicationDate)],
      ["عنوان الدراسة", input.projectTitle],
      ["هدف الدراسة", input.aim],
      ["اسم الباحث الرئيسي", ea.piName],
      ["جهة الباحث الرئيسي", ea.piAffiliation],
      ["بريد الباحث الرئيسي", ea.piEmail],
      ["نوع الباحث الرئيسي", piType],
      ["باحثون آخرون", others],
      ["المشرف الأكاديمي", ea.supervisorNames],
      ["الرقم الجامعي", ea.registrationNo],
      ["تاريخ البدء المتوقع", date(ea.expectedStartDate)],
      ["تاريخ الانتهاء المتوقع", date(ea.expectedEndDate)],
      ["التصميم", input.design],
      ["مكان الدراسة", input.setting],
      ["الأشخاص المشاركون بإجراء الدراسة", ea.personsInvolved],
      ["إدارة البيانات وسريتها", ea.dataManagementConfidentiality],
      ["تفاصيل التمويل", ea.fundingDetails],
    ]),

    k.heading("المبادئ الأخلاقية — Section Two", "٢"),
    k.card(
      principleLabels.map((p) => [
        p.text,
        ea.principles[p.key] ? answerLabel[ea.principles[p.key] as Exclude<EthicalPrincipleAnswer, null>] : "لم يُحدد",
      ]),
      { labelWidth: 68 },
    ),

    k.heading("المرفقات — Section Three", "٣"),
    k.card(
      attachmentLabels.map((a) => [a.text, ea.attachments[a.key] ? "مرفق" : "غير مرفق"]),
      { labelWidth: 68 },
    ),
  ];
  return k.build(children);
}

/** style: "dark" (الافتراضي، هوية Wesync) أو "official" (نسق KAU الرسمي للتقديم) */
export function buildEthicalApprovalDoc(input: EthicalApprovalExportInput, style: WordStyle = "dark"): Promise<Blob> {
  return style === "official" ? buildEthicalOfficial(input) : buildEthicalDark(input);
}
