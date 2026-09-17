import { formatDateLong } from "./date";

export interface MeetingMinutesExportInput {
  meetingDate: string;
  attendees: string[];
  discussion: string;
  decisions: string;
  actionItems: string;
}

/** يبني محضر اجتماع حقيقي (.docx) من البيانات المُدخلة — نفس أسلوب
    buildProposalWordDoc بـ wordExport.ts بالضبط (تحميل مكتبة docx
    ديناميكيًا وقت الحاجة فقط)، يُرفع بعدها لمجلد الفريق بدرايف. */
export async function buildMeetingMinutesDoc(input: MeetingMinutesExportInput): Promise<Blob> {
  const { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");

  function ar(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) {
    return new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { after: 160 },
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

  function arBullet(text: string) {
    return new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      bullet: { level: 0 },
      spacing: { after: 80 },
      children: [new TextRun({ text, rightToLeft: true })],
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 80 },
            children: [
              new TextRun({ text: "Wesync — محضر اجتماع", bold: true, size: 20, color: "8a6d1a", rightToLeft: true }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 240 },
            children: [
              new TextRun({ text: formatDateLong(input.meetingDate), bold: true, rightToLeft: true }),
            ],
          }),

          arHeading("الحاضرون"),
          ...(input.attendees.length > 0
            ? input.attendees.map((a) => arBullet(a))
            : [ar("لم يُحدد أحد.", { color: "999999" })]),

          arHeading("ماذا ناقشنا"),
          ar(input.discussion || "لا يوجد.", { color: input.discussion ? undefined : "999999" }),

          arHeading("القرارات"),
          ar(input.decisions || "لا يوجد.", { color: input.decisions ? undefined : "999999" }),

          arHeading("المهام المطلوبة"),
          ar(input.actionItems || "لا يوجد.", { color: input.actionItems ? undefined : "999999" }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
