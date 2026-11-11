import { assertEquals } from "jsr:@std/assert@1";
import { normalizeCatchup, normalizeSummary, normalizeVoice, transcript } from "./lib.ts";

Deno.test("summary keeps 3 per list and only roster owners", () => {
  const s = normalizeSummary(
    { decided: ["العينة ١٢٠ ممرض", "العينة ١٢٠ ممرض", "٣ مستشفيات", "أ", "ب"], open: ["MBI أو CBI؟"], owners: [{ who: "خالد", what: "البند ٧" }, { who: "سارة", what: "شي" }] },
    ["خالد الحربي", "ريان الشهري"],
  );
  assertEquals(s.decided, ["العينة ١٢٠ ممرض", "٣ مستشفيات", "أ"]);
  assertEquals(s.owners, [{ who: "خالد", what: "البند ٧" }]);
});

Deno.test("catch-up is at most three lines", () => {
  assertEquals(normalizeCatchup({ lines: ["١", "٢", "٣", "٤"] }).length, 3);
  assertEquals(normalizeCatchup(null), []);
});

Deno.test("voice items resolve first names and future dates", () => {
  const roster = [{ id: "r1", name: "ريان الشهري" }, { id: "k1", name: "خالد" }];
  const v = normalizeVoice(
    { gist: "المحضر على ريان", items: [{ kind: "task", title: "ريان يرسل المحضر", sub: "ريان · المحضر", assignee: "ريان", due: "2026-11-12" }, { kind: "date", title: "قديم", sub: "", assignee: "", due: "2020-01-01" }, { kind: "bogus", title: "x", sub: "", assignee: "", due: "" }] },
    roster,
    "2026-11-11",
  );
  assertEquals(v.items.length, 2);
  assertEquals(v.items[0].assignee_id, "r1");
  assertEquals(v.items[0].due, "2026-11-12");
  assertEquals(v.items[1].due, null);
});

Deno.test("transcript keeps the newest lines under the limit", () => {
  const lines = Array.from({ length: 50 }, (_, i) => ({ who: "أ", at: "10:00", text: `رسالة ${i}` }));
  const t = transcript(lines, 120);
  assertEquals(t.endsWith("رسالة 49"), true);
  assertEquals(t.includes("رسالة 0"), false);
});
