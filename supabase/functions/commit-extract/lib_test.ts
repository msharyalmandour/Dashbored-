import { assertEquals } from "jsr:@std/assert@1";
import { normalize, parseDue, resolveAssignee, riyadhToday, SCHEMA } from "./lib.ts";

const roster = [
  { id: "r", name: "ريان الشهري" },
  { id: "k", name: "خالد الحربي" },
  { id: "m", name: "Mshary aymen" },
];

Deno.test("resolveAssignee: الاسم الأول يكفي، وبدون تخمين", () => {
  assertEquals(resolveAssignee("ريان", roster), "r");
  assertEquals(resolveAssignee("خالد الحربي", roster), "k");
  assertEquals(resolveAssignee("mshary", roster), "m");
  assertEquals(resolveAssignee("نورة", roster), null);
  assertEquals(resolveAssignee("", roster), null);
});

Deno.test("parseDue: تاريخ صالح بس، والماضي يتجاهل، والأرقام العربية تنقرا", () => {
  assertEquals(parseDue("2026-11-20", "2026-11-11"), "2026-11-20T06:00:00.000Z");
  assertEquals(parseDue("٢٠٢٦-١١-٢٠", "2026-11-11"), "2026-11-20T06:00:00.000Z");
  assertEquals(parseDue("2026-11-01", "2026-11-11"), null);
  assertEquals(parseDue("الخميس", "2026-11-11"), null);
});

Deno.test("normalize: طلب المحضر المتكرر بعد كل اجتماع (الرسالة الحقيقية)", () => {
  const out = normalize(
    { items: [{ direction: "from_supervisor", title: "إرسال محضر اجتماع الإشراف", quote: "Please send meeting minutes after the supervision meeting", assignee: "", due: "", due_label: "", recurring: "after_meeting" }] },
    roster,
    "2026-11-11",
  );
  assertEquals(out.length, 1);
  assertEquals(out[0].recurring_rule, "after_meeting:24h");
  assertEquals(out[0].due_label, "خلال ٢٤ ساعة بعد كل اجتماع");
  assertEquals(out[0].due_at, null);
});

Deno.test("normalize: وعدها ما ينربط بعضو، والتكرار والفاضي ينشال، وأقصى ٥", () => {
  const items = [
    { direction: "to_team", title: "بأرسل ملاحظاتي على المقترح", quote: "بأرسل ملاحظاتي الأحد", assignee: "ريان", due: "2026-11-15", due_label: "الأحد", recurring: "none" },
    { direction: "to_team", title: "بأرسل ملاحظاتي على المقترح", quote: "", assignee: "", due: "", due_label: "", recurring: "none" },
    { direction: "from_supervisor", title: "", quote: "", assignee: "", due: "", due_label: "", recurring: "none" },
    { direction: "bogus", title: "شي", quote: "", assignee: "", due: "", due_label: "", recurring: "none" },
    ...Array.from({ length: 8 }, (_, i) => ({ direction: "from_supervisor", title: `مهمة رقم ${i}`, quote: "", assignee: "خالد", due: "", due_label: "", recurring: "none" })),
  ];
  const out = normalize({ items }, roster, "2026-11-11");
  assertEquals(out.length, 5);
  assertEquals(out[0].direction, "to_team");
  assertEquals(out[0].assignee_id, null);
  assertEquals(out[0].due_at, "2026-11-15T06:00:00.000Z");
  assertEquals(out[1].assignee_id, "k");
});

Deno.test("normalize: رد مو سليم يرجع فاضي", () => {
  assertEquals(normalize(null, roster, "2026-11-11"), []);
  assertEquals(normalize({ items: "x" }, roster, "2026-11-11"), []);
});

Deno.test("المخطط: كل كائن مقفول وكل خاناته مطلوبة", () => {
  const item = (SCHEMA.properties.items as { items: { additionalProperties: boolean; required: string[]; properties: Record<string, unknown> } }).items;
  assertEquals(item.additionalProperties, false);
  assertEquals(item.required.sort(), Object.keys(item.properties).sort());
});

Deno.test("riyadhToday: يوم الرياض", () => {
  assertEquals(riyadhToday(Date.parse("2026-11-11T22:30:00Z")), { date: "2026-11-12", weekday: "الخميس" });
});
