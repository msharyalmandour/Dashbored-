import type { EvidencePaper } from "../data/types";

/** جدول «Overview of Studies Included in the Literature Review» بنفس أعمدة نموذج الدكتورة */
export const LITERATURE_COLUMNS = ["Author(s)", "Country", "Aim", "Methodology", "Sample", "Data collection", "Main findings"] as const;

const clean = (s: string | undefined) => (s ?? "").replace(/[\t\r\n]+/g, " ").trim();

/** «Devon et al. (2010)» من نص المؤلفين + السنة: أول مؤلف + et al. لو أكثر من واحد */
export function authorCell(authors: string, year: number): string {
  const list = authors.split(/,|;| and /i).map((a) => a.trim()).filter(Boolean);
  const first = list[0] ?? "";
  const label = list.length > 1 ? `${first} et al.` : first;
  return `${label}${label ? " " : ""}(${year})`;
}

export function literatureRows(papers: EvidencePaper[]): string[][] {
  return papers.map((p) => [authorCell(p.authors, p.year), clean(p.country), clean(p.aim), clean(p.studyDesign), clean(p.sample), clean(p.dataCollection), clean(p.keyFinding)]);
}

/** نص مفصول بـ Tab يلصق مباشرة بـ Word/Excel */
export function literatureTsv(papers: EvidencePaper[]): string {
  return [LITERATURE_COLUMNS as readonly string[], ...literatureRows(papers)].map((r) => r.join("\t")).join("\n");
}

/** Word أبيض أفقي (يعرض صح بـ Google Drive وبوورد) — جدول الدراسات جاهز للملحق */
export async function buildLiteratureTableDoc(papers: EvidencePaper[], projectTitle: string): Promise<Blob> {
  const { AlignmentType, BorderStyle, Document, Packer, PageOrientation, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } = await import("docx");
  const FONT = { ascii: "Times New Roman", hAnsi: "Times New Roman", cs: "Arial", eastAsia: "Arial" };
  const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const widths = [11, 8, 17, 12, 16, 16, 20];
  const cell = (text: string, header: boolean, w: number) =>
    new TableCell({
      width: { size: w, type: WidthType.PERCENTAGE },
      borders,
      shading: header ? { type: ShadingType.CLEAR, color: "auto", fill: "D9D9D9" } : undefined,
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [new Paragraph({ bidirectional: false, children: [new TextRun({ text, bold: header, size: 18, font: FONT })] })],
    });
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: LITERATURE_COLUMNS.map((h, i) => cell(h, true, widths[i])) }),
      ...literatureRows(papers).map((r) => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t || "—", false, widths[i])) })),
    ],
  });
  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [
      {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: "Appendix: Overview of Studies Included in the Literature Review", bold: true, size: 24, font: FONT })] }),
          ...(projectTitle ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: projectTitle, size: 20, font: FONT })] })] : []),
          table,
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}
