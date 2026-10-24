import type { Paragraph, Table } from "docx";
import { formatDateFull, formatHijri } from "./date";
import { loadWesyncKit, type WordStyle } from "./wordTheme";
import { tr } from "./i18n";

export interface MeetingMinutesExportInput {
  meetingDate: string;
  agenda?: string;
  attendees: string[];
  discussion: string;
  decisions: string;
  actionItems: string;
}

/** يبني محضر اجتماع حقيقي (.docx) من البيانات المُدخلة — نفس أسلوب
    buildProposalWordDoc بـ wordExport.ts بالضبط (تحميل مكتبة docx
    ديناميكيًا وقت الحاجة فقط)، يُرفع بعدها لمجلد الفريق بدرايف. */
async function buildMinutesOfficial(input: MeetingMinutesExportInput): Promise<Blob> {
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
              new TextRun({ text: tr("Wesync — محضر اجتماع"), bold: true, size: 20, color: "8a6d1a", rightToLeft: true }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 240 },
            children: [
              new TextRun({ text: formatDateFull(input.meetingDate), bold: true, rightToLeft: true }),
            ],
          }),
          ...(formatHijri(input.meetingDate) ? [ar(tr("الموافق {0}", formatHijri(input.meetingDate)), { color: "666666" })] : []),

          arHeading(tr("الحاضرون")),
          ...(input.attendees.length > 0
            ? input.attendees.map((a) => arBullet(a))
            : [ar(tr("لم يُحدد أحد."), { color: "999999" })]),

          ...(input.agenda?.trim() ? [arHeading(tr("جدول الأعمال")), ...input.agenda.split("\n").filter((l) => l.trim()).map((l) => ar(l.trim()))] : []),

          arHeading(tr("ماذا ناقشنا")),
          ar(input.discussion || tr("لا يوجد."), { color: input.discussion ? undefined : "999999" }),

          arHeading(tr("القرارات")),
          ar(input.decisions || tr("لا يوجد."), { color: input.decisions ? undefined : "999999" }),

          arHeading(tr("المهام المطلوبة")),
          ar(input.actionItems || tr("لا يوجد."), { color: input.actionItems ? undefined : "999999" }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

const lines = (text: string) => text.split(/\n+/).map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);

/** نسخة Wesync الداكنة من المحضر: رأس بالتاريخ، بطاقة حضور، ومهام كقائمة */
async function buildMinutesDark(input: MeetingMinutesExportInput): Promise<Blob> {
  const k = await loadWesyncKit({ label: tr("محضر اجتماع — Meeting Minutes"), title: tr("محضر اجتماع {0}", input.meetingDate) });
  const actions = lines(input.actionItems);
  const children: (Paragraph | Table)[] = [
    ...k.masthead({
      kicker: tr("محضر اجتماع — MEETING MINUTES"),
      title: formatDateFull(input.meetingDate),
      sub: [formatHijri(input.meetingDate), `${input.attendees.length} ${input.attendees.length === 1 ? tr("حاضر") : tr("حاضرين")}`]
        .filter(Boolean)
        .join(" · "),
    }),

    k.heading(tr("الحاضرون")),
    ...k.bullets(input.attendees, tr("لم يُحدد أحد.")),

    ...(input.agenda?.trim() ? [k.heading(tr("جدول الأعمال")), ...k.narrative(input.agenda, "")] : []),

    k.heading(tr("ماذا ناقشنا")),
    ...k.narrative(input.discussion, tr("لا يوجد.")),

    k.heading(tr("القرارات")),
    k.callout(tr("القرارات المتخذة"), input.decisions),

    k.heading(tr("المهام المطلوبة")),
    ...k.bullets(actions, tr("لا يوجد.")),
  ];
  return k.build(children);
}

/** style: "dark" (الافتراضي، هوية Wesync) أو "official" (أبيض بسيط) */
export function buildMeetingMinutesDoc(input: MeetingMinutesExportInput, style: WordStyle = "dark"): Promise<Blob> {
  return style === "official" ? buildMinutesOfficial(input) : buildMinutesDark(input);
}
