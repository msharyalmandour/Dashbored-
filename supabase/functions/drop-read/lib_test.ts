// اختبارات «ارموا أي شي» (المرحلة ١): كل صف من جدول التوزيع، حالة التقسيم، النوع غير المدعوم، والحد الشهري.
// التشغيل: deno test supabase/functions/drop-read/lib_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1";
import { strToU8, zipSync } from "npm:fflate@0.8.2";
import {
  csvToTable,
  type Ctx,
  detectKind,
  docxToText,
  inferPlace,
  inputHash,
  type ItemCtx,
  looksScanned,
  arabicLayerBroken,
  meanConfidence,
  monthStartIso,
  normalizeResults,
  parseDue,
  pdfPageCount,
  RESULT_SCHEMA,
  sectionByHeading,
  targetCount,
  xlsxToTable,
} from "./lib.ts";
import { monthlyLimit, MONTHLY_AI_READS } from "./limits.ts";

const TODAY = "2026-11-10"; // ثلاثاء
const roster = [
  { id: "u-sara", name: "سارة الغامدي" },
  { id: "u-noura", name: "نورة العتيبي" },
  { id: "u-reem", name: "ريم القحطاني" },
];
const item = (o: Partial<ItemCtx> = {}): ItemCtx => ({ index: 1, id: "i1", kind: "file", name: "file.pdf", mime: "application/pdf", size: 1000, storagePath: "team/drop/file.pdf", fileKind: "pdf", text: "", ...o });
const ctx = (items: ItemCtx[]): Ctx => ({ today: TODAY, roster, items });
const run = (results: unknown[], items: ItemCtx[] = [item()]) => normalizeResults({ summary: "", results }, ctx(items));

function docx(paragraphs: [string, string][]) {
  const body = paragraphs.map(([style, t]) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`).join("");
  return zipSync({ "word/document.xml": strToU8(`<?xml version="1.0"?><w:document xmlns:w="x"><w:body>${body}</w:body></w:document>`) });
}

// ───────── أنواع الملفات ─────────
Deno.test("detectKind: الأنواع المقبولة", () => {
  assertEquals(detectKind("a.pdf", "").kind, "pdf");
  assertEquals(detectKind("IMG_1.JPG", "image/jpeg").kind, "image");
  assertEquals(detectKind("x.webp", "").kind, "image");
  assertEquals(detectKind("s.docx", "").kind, "docx");
  assertEquals(detectKind("r.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").kind, "xlsx");
  assertEquals(detectKind("r.csv", "application/vnd.ms-excel").kind, "csv");
  assertEquals(detectKind("n.md", "").kind, "text");
});

Deno.test("detectKind: نوع غير مدعوم", () => {
  assertEquals(detectKind("old.doc", "application/msword"), { kind: "unsupported", reason: "word_old" });
  assertEquals(detectKind("p.heic", "image/heic"), { kind: "unsupported", reason: "heic" });
  assertEquals(detectKind("a.zip", "application/zip"), { kind: "unsupported", reason: "type" });
  assertEquals(detectKind("old.xls", ""), { kind: "unsupported", reason: "excel_old" });
});

Deno.test("نوع غير مدعوم يروح للملفات بدل ما يضيع", () => {
  const z = item({ id: "z", name: "archive.zip", mime: "application/zip", fileKind: "unsupported" });
  const rows = run([], [z]);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].destination, "files");
  assertEquals(rows[0].payload.storage_path, "team/drop/file.pdf");
  assertEquals(rows[0].payload.name, "archive.zip");
});

// ───────── القراءة ─────────
Deno.test("DOCX: النص مع العناوين", () => {
  const t = docxToText(docx([["Title", "مقترح البحث"], ["Heading1", "الخلفية"], ["", "التمريض في السعودية &amp; التحديات."], ["Heading1", "المشكلة"], ["", "نقص الدراسات."]]))!;
  assertEquals(t, "## مقترح البحث\n## الخلفية\nالتمريض في السعودية & التحديات.\n## المشكلة\nنقص الدراسات.");
  assertEquals(sectionByHeading(t, "الخلفية"), "التمريض في السعودية & التحديات.");
  assertEquals(sectionByHeading(t, "## المشكلة"), "نقص الدراسات.");
  assertEquals(sectionByHeading(t, "المنهجية"), "");
  assertEquals(docxToText(new Uint8Array([1, 2, 3])), null);
});

Deno.test("XLSX: العناوين + عدد الصفوف + عيّنة ٢٠", () => {
  const rows = Array.from({ length: 25 }, (_, i) => `<row r="${i + 2}"><c r="A${i + 2}"><v>${i + 1}</v></c><c r="C${i + 2}" t="inlineStr"><is><t>نعم</t></is></c></row>`).join("");
  const sheet = `<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>${rows}</sheetData></worksheet>`;
  const ss = `<sst><si><t>العمر</t></si><si><r><t>الجن</t></r><r><t>س</t></r></si><si><t>موافق؟</t></si></sst>`;
  const t = xlsxToTable(zipSync({ "xl/worksheets/sheet1.xml": strToU8(sheet), "xl/sharedStrings.xml": strToU8(ss) }))!;
  assertEquals(t.columns, ["العمر", "الجنس", "موافق؟"]);
  assertEquals(t.rowCount, 25);
  assertEquals(t.sample.length, 20);
  assertEquals(t.sample[0], ["1", "", "نعم"]);
});

Deno.test("CSV: فواصل منقوطة واقتباس وأسطر", () => {
  const t = csvToTable('﻿name;note\r\n"سارة";"قالت ""نعم"""\r\nنورة;"سطر\nثاني"\r\n');
  assertEquals(t.columns, ["name", "note"]);
  assertEquals(t.rowCount, 2);
  assertEquals(t.sample[0], ["سارة", 'قالت "نعم"']);
  assertEquals(t.sample[1], ["نورة", "سطر\nثاني"]);
});

Deno.test("PDF: عدد الصفحات وكشف الممسوح", () => {
  const fake = new TextEncoder().encode("%PDF-1.4 1 0 obj <</Type /Pages /Count 3>> 2 0 obj <</Type /Page>> <</Type/Page>> <</Type /Page /Parent 1 0 R>>");
  assertEquals(pdfPageCount(fake), 3);
  assert(looksScanned("  ", 3, 200));
  assert(!looksScanned("x".repeat(900), 3, 200));
  assert(arabicLayerBroken("ﺚﺤﺒﻟا ﻖﻳﺮﻓ مّ ﺪﻘﺗ ﺮﻳﺮﻘﺗ وراتﺪﻟا ﻲﻓ ﺾﻳﺮﻤﺘﻟا ﻲﺑرﺪﺘﻣ ﻞﻴﺼﺤﺗو"));
  assert(!arabicLayerBroken("تقرير يقدّمه فريق البحث عن تحصيل متدربي التمريض"));
  assert(!arabicLayerBroken("Burnout among ICU nurses in Saudi Arabia"));
});

// ───────── التواريخ والأسماء والأماكن ─────────
Deno.test("parseDue: «الخميس» والتواريخ النسبية", () => {
  assertEquals(parseDue("الخميس", TODAY), "2026-11-12");
  assertEquals(parseDue("الثلاثاء", TODAY), "2026-11-17"); // نفس اليوم = الأسبوع الجاي
  assertEquals(parseDue("بكرة", TODAY), "2026-11-11");
  assertEquals(parseDue("بعد بكرة", TODAY), "2026-11-12");
  assertEquals(parseDue("١٥/١١", TODAY), "2026-11-15");
  assertEquals(parseDue("5/1", TODAY), "2027-01-05");
  assertEquals(parseDue("2026-02-30", TODAY), "");
  assertEquals(parseDue("قريب", TODAY), "");
});

Deno.test("targetCount + inferPlace", () => {
  assertEquals(targetCount("ابحث عن ٥ دراسات"), 5);
  assertEquals(targetCount("اجمعي خمس دراسات"), 5);
  assertEquals(targetCount("راجعي الخلفية"), null);
  assertEquals(inferPlace("عبي جدول الأدبيات"), "literature");
  assertEquals(inferPlace("وزعوا الاستبيان"), "surveys");
});

// ───────── جدول التوزيع: صف صف ─────────
Deno.test("توزيع: دراسة PDF → المكتبة + صف بالجدول", () => {
  const [r] = run([{ item: 1, destination: "library", title: "دراسة الاحتراق الوظيفي", confidence: 0.92, payload: { title: "Burnout among ICU nurses", authors: "Alharbi A, Smith J", year: 2023, country: "Saudi Arabia", aim: "To assess burnout.", design: "Cross-sectional", sample: "٢٥٠ ممرضة", data_collection: "Questionnaire", finding: "٦٢٪ احتراق", relevance: "يدعم الخلفية", section: "background", theme: "الاحتراق", url: "" } }]);
  assertEquals(r.destination, "library");
  assertEquals(r.payload.year, 2023);
  assertEquals(r.payload.section, "background");
  assertEquals(r.payload.country, "Saudi Arabia");
  assertEquals(r.confidence, 0.92);
});

Deno.test("توزيع: دراسة من رابط PubMed تاخذ الرابط، والسنة الغلط تنشال", () => {
  const u = item({ kind: "url", fileKind: "url", url: "https://pubmed.ncbi.nlm.nih.gov/123456/", storagePath: null });
  const [r] = run([{ item: 1, destination: "library", title: "x", confidence: 0.9, payload: { title: "T", authors: "", year: 3020, country: "", aim: "", design: "", sample: "", data_collection: "", finding: "", relevance: "", section: "weird", theme: "", url: "" } }], [u]);
  assertEquals(r.payload.url, "https://pubmed.ncbi.nlm.nih.gov/123456/");
  assertEquals(r.payload.year, null);
  assertEquals(r.payload.section, "literature-review");
  assertEquals(r.payload.theme, "عام");
});

Deno.test("توزيع: قائمة مهام → مهمة لكل سطر، المسؤول من الأسماء، «الخميس» تاريخ، ٥ دراسات → المكتبة", () => {
  const [r] = run([
    {
      item: 1,
      destination: "tasks",
      title: "٣ مهام من السبورة",
      confidence: 0.85,
      payload: {
        tasks: [
          { title: "ابحثي عن ٥ دراسات", owner: "سارة", due: "الخميس", place: "", target_count: null, note: "" },
          { title: "عبي جدول الأدبيات", owner: "نورة العتيبي", due: "2026-11-20", place: "literature", target_count: null, note: "" },
          { title: "راجعي الخلفية", owner: "شخص مو بالفريق", due: "", place: "background", target_count: null, note: "" },
          { title: "  ", owner: "", due: "", place: "", target_count: null, note: "" },
        ],
      },
    },
  ]);
  const tasks = r.payload.tasks as Record<string, unknown>[];
  assertEquals(tasks.length, 3);
  assertEquals(tasks[0], { title: "ابحثي عن ٥ دراسات", note: "", owner_id: "u-sara", owner_name: "سارة", due: "2026-11-12", place: "evidence", target_count: 5 });
  assertEquals(tasks[1].owner_id, "u-noura");
  assertEquals(tasks[1].place, "literature");
  assertEquals(tasks[2].owner_id, null);
});

Deno.test("توزيع: محضر اجتماع", () => {
  const [r] = run([{ item: 1, destination: "minutes", title: "محضر", confidence: 0.9, payload: { meeting_date: "", agenda: "المنهجية", discussion: "ناقشنا العينة", decisions: "عينة ٢٠٠", action_items: ["تواصل مع المستشفى", ""] } }]);
  assertEquals(r.payload.meeting_date, TODAY);
  assertEquals(r.payload.action_items, ["تواصل مع المستشفى"]);
});

Deno.test("توزيع: لقطة واتساب من الدكتورة → ملاحظات مشرف + مهام", () => {
  const rows = run([
    { item: 1, destination: "supervisor_note", title: "ملاحظات د. هند", confidence: 0.88, payload: { comments: [{ text: "الهدف عام، حددوه", section: "aim" }, { text: "زيدوا مراجع حديثة", section: "nonsense" }] } },
    { item: 1, destination: "tasks", title: "مهام من الدكتورة", confidence: 0.8, payload: { tasks: [{ title: "عدلوا الهدف", owner: "", due: "", place: "aim", target_count: null, note: "" }] } },
  ]);
  assertEquals(rows.map((r) => r.destination), ["supervisor_note", "tasks"]);
  assertEquals((rows[0].payload.comments as { section: string }[])[1].section, "other");
});

Deno.test("توزيع: ملف Word لقسم → مسودة جديدة بنص الفريق نفسه (ما ينكتب فوق)", () => {
  const text = "## الخلفية\nيعاني الممرضون في وحدات العناية المركزة من ضغط عمل عالي حسب الدراسات.\n## المشكلة\nقلة الدراسات المحلية عن هالموضوع بالمنطقة الغربية تحديدًا.";
  const w = item({ name: "proposal.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileKind: "docx", text });
  const rows = run(
    [
      { item: 1, destination: "proposal", title: "الخلفية", confidence: 0.9, payload: { section: "background", heading: "الخلفية" } },
      { item: 1, destination: "proposal", title: "المشكلة", confidence: 0.9, payload: { section: "problem", heading: "المشكلة" } },
      { item: 1, destination: "proposal", title: "قسم بدون نص", confidence: 0.9, payload: { section: "gap", heading: "الفجوة" } },
    ],
    [w],
  );
  assertEquals(rows.length, 2);
  assertEquals(rows[0].payload.text, "يعاني الممرضون في وحدات العناية المركزة من ضغط عمل عالي حسب الدراسات.");
  assertEquals(rows[1].payload.section, "problem");
});

Deno.test("توزيع: Excel ردود → بيانات (الأعمدة والعدد من قراءتنا مو من الذكاء)", () => {
  const x = item({ name: "responses.xlsx", fileKind: "xlsx", storagePath: "t/d/responses.xlsx", table: { columns: ["العمر", "الخبرة"], rowCount: 120, sample: [["25", "3"]] } });
  const [r] = run([{ item: 1, destination: "dataset", title: "ردود الاستبيان", confidence: 0.95, payload: { name: "ردود الاستبيان", description: "١٢٠ رد" } }], [x]);
  assertEquals(r.payload.row_count, 120);
  assertEquals(r.payload.columns, ["العمر", "الخبرة"]);
  assertEquals(r.payload.storage_path, "t/d/responses.xlsx");
  // بيانات بدون جدول (ملف مو جدول) ما تنقبل، فيروح للملفات
  const rows = run([{ item: 1, destination: "dataset", title: "x", confidence: 0.9, payload: { name: "", description: "" } }]);
  assertEquals(rows.map((r) => r.destination), ["files"]);
});

Deno.test("توزيع: استبيان/مقياس → أدوات القياس", () => {
  const [r] = run([{ item: 1, destination: "tools", title: "مقياس ماسلاك", confidence: 0.9, payload: { tool_name: "Maslach Burnout Inventory", items_count: "22 items", dimensions: "Exhaustion, Depersonalization, Accomplishment", scale: "7-point" } }]);
  assertEquals(r.payload.tool_name, "Maslach Burnout Inventory");
});

Deno.test("توزيع: خطاب الموافقة الأخلاقية → الرقم والتاريخ", () => {
  const [r] = run([{ item: 1, destination: "ethics", title: "موافقة اللجنة", confidence: 0.93, payload: { approval_number: "Reference No: 123-24", approval_date: "٠٣/١١/٢٠٢٦" } }]);
  assertEquals(r.payload, { approval_number: "Reference No: 123-24", approval_date: "2026-11-03" });
});

Deno.test("توزيع: جدول مواعيد → أحداث التقويم (اللي بدون تاريخ تنشال)", () => {
  const [r] = run([{ item: 1, destination: "calendar", title: "مواعيد التسليم", confidence: 0.8, payload: { events: [{ title: "تسليم المقترح", date: "2026-12-01", time: "١٠:٠٠", type: "deadline" }, { title: "عرض", date: "قريب", time: "", type: "meeting" }, { title: "اجتماع", date: "الأحد", time: "9am", type: "x" }] } }]);
  assertEquals(r.payload.events, [
    { title: "تسليم المقترح", date: "2026-12-01", time: "10:00", type: "deadline" },
    { title: "اجتماع", date: "2026-11-15", time: "", type: "meeting" },
  ]);
});

Deno.test("توزيع: أي شي ثاني → الملفات", () => {
  const [r] = run([{ item: 1, destination: "files", title: "صورة شعار", confidence: 0.7, payload: { name: "", why: "شعار الكلية" } }]);
  assertEquals(r.destination, "files");
  assertEquals(r.payload.why, "شعار الكلية");
  assertEquals(r.payload.mime, "application/pdf");
});

// ───────── التقسيم ─────────
Deno.test("حالة التقسيم: ملاحظات اجتماع → محضر + ٣ مهام + سؤال للمشرف", () => {
  const notes = item({ kind: "text", fileKind: "text", name: "", storagePath: null, text: "اجتماع اليوم..." });
  const rows = run(
    [
      { item: 1, destination: "minutes", title: "محضر اجتماع ١٠ نوفمبر", confidence: 0.9, payload: { meeting_date: "2026-11-10", agenda: "", discussion: "ناقشنا الأداة", decisions: "نستخدم ماسلاك", action_items: ["أ", "ب", "ج"] } },
      { item: 1, destination: "tasks", title: "٣ مهام", confidence: 0.85, payload: { tasks: ["أ", "ب", "ج"].map((t) => ({ title: `سووا ${t}`, owner: "ريم", due: "بكرة", place: "", target_count: null, note: "" })) } },
      { item: 1, destination: "supervisor_question", title: "سؤال للمشرفة", confidence: 0.8, payload: { question: "نستخدم ماسلاك ولا كوبنهاقن؟", options: ["ماسلاك", "كوبنهاقن"] } },
    ],
    [notes],
  );
  assertEquals(rows.map((r) => r.destination), ["minutes", "tasks", "supervisor_question"]);
  assertEquals((rows[1].payload.tasks as unknown[]).length, 3);
  assertEquals((rows[1].payload.tasks as { owner_id: string; due: string }[])[0], { title: "سووا أ", note: "", owner_id: "u-reem", owner_name: "ريم", due: "2026-11-11", place: "", target_count: null } as never);
  assertEquals(rows[2].payload.options, ["ماسلاك", "كوبنهاقن"]);
  assertEquals(rows.map((r) => r.ord), [0, 1, 2]);
  // نص ما يروح للملفات تلقائيًا
  assert(!rows.some((r) => r.destination === "files"));
});

Deno.test("سؤال بخيار واحد = رسالة عادية (بدون خيارات)", () => {
  const [r] = run([{ item: 1, destination: "supervisor_question", title: "سؤال", confidence: 0.8, payload: { question: "متى نقدر نسلّم؟", options: ["الأحد"] } }]);
  assertEquals(r.payload.options, []);
});

Deno.test("رد غلط: وجهات مو معروفة تنشال، والثقة تنقص لـ ٠-١", () => {
  const rows = run([{ item: 9, destination: "hack", title: "x", confidence: 2, payload: {} }, { item: 9, destination: "files", title: "", confidence: 7, payload: { name: "", why: "" } }]);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].confidence, 1);
  assertEquals(rows[0].item_id, "i1");
  assertEquals(rows[0].title, "ملف");
  assertEquals(normalizeResults(null, ctx([])), []);
  assertEquals(meanConfidence([{ confidence: 0.5 }, { confidence: 1 }]), 0.75);
});

// ───────── الكاش والحد الشهري ─────────
Deno.test("بصمة الرمية ما تتأثر بالترتيب", async () => {
  assertEquals(await inputHash(["a", "b"]), await inputHash(["b", "a"]));
  assert((await inputHash(["a"])) !== (await inputHash(["b"])));
});

Deno.test("الحد الشهري: المجانية ٢٠، والباقة الذكية أكثر، من ملف واحد", () => {
  assertEquals(monthlyLimit("basic", false), 20);
  assertEquals(monthlyLimit("basic", true), MONTHLY_AI_READS.trial);
  assertEquals(monthlyLimit("ai", false), MONTHLY_AI_READS.ai);
  assert(MONTHLY_AI_READS.ai > MONTHLY_AI_READS.basic);
  assertEquals(monthlyLimit(null, null), 20);
  // بداية الشهر بتوقيت الرياض
  assertEquals(monthStartIso(new Date("2026-11-30T22:00:00Z")), "2026-11-30T21:00:00.000Z"); // ١ ديسمبر ١ الفجر بالرياض
  assertEquals(monthStartIso(new Date("2026-11-10T12:00:00Z")), "2026-10-31T21:00:00.000Z");
});

// ───────── المخطط ─────────
Deno.test("المخطط: صغير (بدون anyOf)، كل كائن additionalProperties:false وكل خاناته required", () => {
  const walk = (s: Record<string, unknown>): void => {
    assert(!("anyOf" in s));
    if (s.type === "object") {
      assertEquals(s.additionalProperties, false);
      assertEquals([...(s.required as string[])].sort(), Object.keys(s.properties as object).sort());
      for (const v of Object.values(s.properties as Record<string, Record<string, unknown>>)) walk(v);
    }
    if (s.items) walk(s.items as Record<string, unknown>);
    for (const k of ["minimum", "maximum", "minLength", "maxLength"]) assert(!(k in s));
  };
  walk(RESULT_SCHEMA as Record<string, unknown>);
  assert(JSON.stringify(RESULT_SCHEMA).length < 800);
});

Deno.test("payload_json: نص JSON ينقرا، والغلط ينشال", () => {
  const rows = run([
    { item: 1, destination: "ethics", title: "موافقة", confidence: 0.9, payload_json: JSON.stringify({ approval_number: "412-25", approval_date: "2026-11-03" }) },
    { item: 1, destination: "tools", title: "x", confidence: 0.9, payload_json: "{not json" },
    { item: 1, destination: "tools", title: "x", confidence: 0.9, payload_json: "[1,2]" },
  ]);
  assertEquals(rows.map((r) => r.destination), ["ethics"]);
  assertEquals(rows[0].payload, { approval_number: "412-25", approval_date: "2026-11-03" });
});
