import { downloadWordDoc } from "./wordExport";

/** يبني ملف Word بسيط (عنوان + فقرات) من نص عادي — للنماذج القابلة للتعديل (موافقة، إذن، خطاب). */
export async function downloadTextAsWord(title: string, text: string, rtl: boolean, filename: string) {
  const { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
  const align = rtl ? AlignmentType.START : AlignmentType.LEFT;
  const paragraphs = text.split("\n").map(
    (line) =>
      new Paragraph({
        alignment: align,
        bidirectional: rtl,
        spacing: { after: 120 },
        children: [new TextRun({ text: line, rightToLeft: rtl, size: 24 })],
      }),
  );
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            bidirectional: rtl,
            spacing: { after: 240 },
            children: [new TextRun({ text: title, bold: true, rightToLeft: rtl, size: 32 })],
          }),
          ...paragraphs,
        ],
      },
    ],
  });
  downloadWordDoc(await Packer.toBlob(doc), filename);
}
