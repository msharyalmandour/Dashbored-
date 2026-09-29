/** هوية Wesync الداكنة لملفات Word — "Obsidian × Ember": صفحة سوداء دافئة، نص
    عاجي، ولمسة برتقالية للعناوين والخطوط. كل التصديرات (المقترح، محضر الاجتماع،
    الموافقة الأخلاقية) تبني عليها عشان يطلع كلها بنفس الأسلوب.

    ملاحظات تقنية مهمة:
    - خلفية الصفحة (w:background) تظهر بـ Word بوضع Print Layout، لكن Word ما يطبعها
      افتراضيًا (File ▸ Options ▸ Display ▸ Print background colors) — عشان كذا كل
      تصدير يبقى معه خيار "نسخة رسمية فاتحة" للتسليم والطباعة.
    - ما نستخدم أي خط مدمج: Segoe UI موجود بويندوز، وWord يبدّله تلقائيًا بأقرب خط
      بأنظمة ثانية (والعربي يظهر بأي حال). */

export type WordStyle = "dark" | "official";

export const C = {
  page: "0B0B0C",
  surface: "151517",
  surface2: "1C1C1F",
  line: "2C2C31",
  text: "EDEAE4",
  muted: "9A968E",
  faint: "6F6C66",
  ember: "FF8A24",
  emberSoft: "2A1A0D",
} as const;

const FONT = { ascii: "Segoe UI", hAnsi: "Segoe UI", cs: "Segoe UI", eastAsia: "Segoe UI" };

type Docx = typeof import("docx");

export interface RunOpts {
  size?: number;
  bold?: boolean;
  italics?: boolean;
  color?: string;
  /** false للنص اللاتيني (مراجع، اسم العلامة) */
  rtl?: boolean;
  spacing?: number;
}

export interface ParaOpts {
  after?: number;
  before?: number;
  line?: number;
  rtl?: boolean;
  center?: boolean;
  keepNext?: boolean;
}

/** يحمّل مكتبة docx (ثقيلة، ديناميكيًا وقت الحاجة) ويرجّع أدوات بناء بهوية Wesync */
export async function loadWesyncKit(meta: { label: string; title: string }) {
  const d: Docx = await import("docx");
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    Header,
    HeadingLevel,
    LevelFormat,
    Packer,
    PageBreak,
    PageNumber,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = d;

  const none = { style: BorderStyle.NONE, size: 0, color: "auto" } as const;
  const noBorders = { top: none, bottom: none, left: none, right: none } as const;

  const run = (text: string, o: RunOpts = {}) =>
    new TextRun({
      text,
      size: o.size ?? 23,
      bold: o.bold,
      italics: o.italics,
      color: o.color ?? C.text,
      font: FONT,
      rightToLeft: o.rtl ?? true,
      characterSpacing: o.spacing,
    });

  const para = (children: InstanceType<typeof TextRun>[], o: ParaOpts = {}) =>
    new Paragraph({
      bidirectional: o.rtl ?? true,
      alignment: o.center ? AlignmentType.CENTER : AlignmentType.START,
      keepNext: o.keepNext,
      spacing: { before: o.before ?? 0, after: o.after ?? 140, line: o.line ?? 384 },
      children,
    });

  /** نص عادي؛ الأسطر الجديدة تصير فقرات منفصلة */
  const body = (text: string, o: { color?: string; size?: number } = {}) => {
    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    return lines.map((l) => para([run(l, { color: o.color, size: o.size })]));
  };

  const empty = (text: string) => [para([run(text, { color: C.faint, italics: true })])];

  /** نص أو "لم يُكتب بعد" بلون خافت */
  const narrative = (text: string, placeholder = "لم يُكتب بعد.") => (text.trim() ? body(text) : empty(placeholder));

  const heading = (title: string, num?: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      bidirectional: true,
      alignment: AlignmentType.START,
      keepNext: true,
      spacing: { before: 460, after: 180, line: 300 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.line, space: 8 } },
      children: [
        ...(num ? [run(`${num}   `, { size: 30, bold: true, color: C.ember })] : []),
        run(title, { size: 30, bold: true, color: C.text }),
      ],
    });

  /** عنوان فرعي صغير بلون خافت — مثل "أ. تصميم الدراسة" */
  const label = (text: string) =>
    para([run(text, { size: 21, bold: true, color: C.ember })], { before: 200, after: 80, keepNext: true, line: 300 });

  const bullet = (text: string) =>
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.START,
      numbering: { reference: "wesync-bullet", level: 0 },
      spacing: { after: 90, line: 372 },
      children: [run(text)],
    });

  const bullets = (items: string[], placeholder = "لم تُحدد بعد.") =>
    items.length > 0 ? items.map(bullet) : empty(placeholder);

  const latin = (text: string) =>
    new Paragraph({
      bidirectional: false,
      alignment: AlignmentType.START,
      spacing: { after: 140, line: 340 },
      indent: { start: 480, hanging: 480 },
      children: [run(text, { rtl: false, size: 21, color: C.muted })],
    });

  const rule = (color: string = C.ember, size = 18, before = 0, after = 0) =>
    new Paragraph({
      spacing: { before, after },
      border: { bottom: { style: BorderStyle.SINGLE, size, color, space: 1 } },
      children: [],
    });

  /** جدول بسيط: صف لكل (عنوان، قيمة) داخل بطاقة رمادية داكنة بحد برتقالي على الحافة */
  const card = (rows: [string, string][], opts: { labelWidth?: number } = {}) => {
    const labelW = opts.labelWidth ?? 32;
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      visuallyRightToLeft: true,
      borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
      rows: rows.map(
        ([k, v], i) =>
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: labelW, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, color: "auto", fill: i % 2 ? C.surface : C.surface2 },
                // start = الحافة الأمامية منطقيًا (يمين بالعربي) بغض النظر عن اتجاه الجدول
                borders: { ...noBorders, start: { style: BorderStyle.SINGLE, size: 24, color: C.ember } },
                margins: { top: 110, bottom: 110, left: 220, right: 220 },
                children: [para([run(k, { size: 20, bold: true, color: C.muted })], { after: 0, line: 300 })],
              }),
              new TableCell({
                width: { size: 100 - labelW, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, color: "auto", fill: i % 2 ? C.surface : C.surface2 },
                borders: noBorders,
                margins: { top: 110, bottom: 110, left: 220, right: 220 },
                children: [para([run(v || "—", { size: 22, color: v ? C.text : C.faint })], { after: 0, line: 340 })],
              }),
            ],
          }),
      ),
    });
  };

  /** بطاقة إبراز (قرارات، فجوة بحثية…) — خلفية دافئة وحد برتقالي سميك */
  const callout = (title: string, text: string) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      visuallyRightToLeft: true,
      borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, color: "auto", fill: C.emberSoft },
              borders: { ...noBorders, start: { style: BorderStyle.SINGLE, size: 36, color: C.ember } },
              margins: { top: 180, bottom: 160, left: 280, right: 280 },
              children: [
                para([run(title, { size: 20, bold: true, color: C.ember })], { after: 80, line: 300 }),
                ...(text.trim() ? body(text) : empty("لا يوجد.")),
              ],
            }),
          ],
        }),
      ],
    });

  /** غلاف صفحة كاملة */
  const cover = (o: { title: string; kicker: string; meta: [string, string][]; note: string }) => [
    para([run("WESYNC", { size: 44, bold: true, color: C.ember, rtl: false, spacing: 160 })], { before: 1500, after: 40, line: 300 }),
    para([run("منصة إدارة أبحاث التخرج التمريضي", { size: 20, color: C.muted })], { after: 0, line: 300 }),
    rule(C.ember, 18, 260, 1100),
    para([run(o.kicker, { size: 24, bold: true, color: C.ember, spacing: 40 })], { after: 140, line: 300 }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      bidirectional: true,
      alignment: AlignmentType.START,
      spacing: { after: 700, line: 330 },
      children: [run(o.title, { size: 64, bold: true })],
    }),
    card(o.meta, { labelWidth: 30 }),
    para([run(o.note, { size: 19, color: C.faint })], { before: 900, after: 0, line: 300 }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  /** رأس تعريفي لوثيقة من صفحة واحدة/بدون غلاف */
  const masthead = (o: { kicker: string; title: string; sub?: string }) => [
    para([run("WESYNC", { size: 26, bold: true, color: C.ember, rtl: false, spacing: 120 })], { after: 20, line: 280 }),
    rule(C.ember, 12, 40, 320),
    para([run(o.kicker, { size: 22, bold: true, color: C.ember, spacing: 30 })], { after: 100, line: 300 }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      bidirectional: true,
      alignment: AlignmentType.START,
      spacing: { after: o.sub ? 100 : 320, line: 330 },
      children: [run(o.title, { size: 52, bold: true })],
    }),
    ...(o.sub ? [para([run(o.sub, { size: 21, color: C.muted })], { after: 320, line: 300 })] : []),
  ];

  const header = new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        visuallyRightToLeft: true,
        borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: { ...noBorders, bottom: { style: BorderStyle.SINGLE, size: 4, color: C.line } },
                margins: { bottom: 100 },
                children: [para([run(meta.label, { size: 18, color: C.muted })], { after: 0, line: 260 })],
              }),
              new TableCell({
                borders: { ...noBorders, bottom: { style: BorderStyle.SINGLE, size: 4, color: C.line } },
                margins: { bottom: 100 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.END,
                    bidirectional: true,
                    children: [run("WESYNC", { size: 18, bold: true, color: C.ember, rtl: false, spacing: 100 })],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 8 } },
        children: [
          run("Wesync", { size: 17, color: C.faint, rtl: false }),
          run("   ·   ", { size: 17, color: C.faint, rtl: false }),
          new TextRun({ children: [PageNumber.CURRENT], size: 17, color: C.muted, font: FONT }),
          run(" / ", { size: 17, color: C.faint, rtl: false }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 17, color: C.faint, font: FONT }),
        ],
      }),
    ],
  });

  const emptyHeader = new Header({ children: [new Paragraph({ children: [] })] });
  const emptyFooter = new Footer({ children: [new Paragraph({ children: [] })] });

  /** يجمع الوثيقة ويرجّع Blob جاهز للتنزيل */
  const build = (children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[], o: { hasCover?: boolean } = {}) =>
    Packer.toBlob(
      new Document({
        creator: "Wesync",
        title: meta.title,
        description: `${meta.label} — Wesync`,
        background: { color: C.page },
        styles: {
          default: {
            document: {
              run: { font: FONT, size: 23, color: C.text },
              paragraph: { spacing: { line: 384 } },
            },
          },
          paragraphStyles: [
            {
              id: "Title",
              name: "Title",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              run: { font: FONT, bold: true, color: C.text },
            },
            {
              id: "Heading1",
              name: "Heading 1",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              run: { font: FONT, bold: true, color: C.text },
            },
          ],
        },
        numbering: {
          config: [
            {
              reference: "wesync-bullet",
              levels: [
                {
                  level: 0,
                  format: LevelFormat.BULLET,
                  text: "◆",
                  alignment: AlignmentType.START,
                  style: {
                    paragraph: { indent: { start: 560, hanging: 320 } },
                    run: { color: C.ember, size: 16, font: FONT },
                  },
                },
              ],
            },
          ],
        },
        sections: [
          {
            properties: {
              titlePage: !!o.hasCover,
              page: {
                size: { width: 11906, height: 16838 },
                margin: { top: 1500, bottom: 1300, left: 1250, right: 1250, header: 600, footer: 560 },
              },
            },
            headers: { default: header, first: emptyHeader },
            footers: { default: footer, first: emptyFooter },
            children,
          },
        ],
      }),
    );

  return { run, para, body, empty, narrative, heading, label, bullet, bullets, latin, rule, card, callout, cover, masthead, build };
}
