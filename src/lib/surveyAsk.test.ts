import { describe, expect, it } from "vitest";
import { buildColumns, runPlan, SCALE_ID, type AskPlan } from "./surveyAsk";
import type { Question } from "./surveyCoach";
import type { SurveyResponse } from "../hooks/useSurveys";

const qs: Question[] = [
  { id: "lvl", type: "single", text: "المرحلة", options: ["سنة ثالثة", "سنة رابعة", "امتياز"], required: true },
  { id: "sat1", type: "likert", text: "رضا ١", required: true },
  { id: "sat2", type: "likert", text: "رضا ٢", required: true },
  { id: "sat3", type: "likert", text: "رضا ٣", required: true },
  { id: "age", type: "number", text: "العمر", required: false },
  { id: "free", type: "text", text: "ملاحظات", required: false },
];

const mk = (lvl: string, s: number, age: number, i: number): SurveyResponse => ({
  id: `r${i}`,
  createdAt: "2026-01-01",
  answers: { lvl, sat1: s, sat2: s, sat3: s, age, free: "x" },
});

// مجموعتين واضح الفرق بينهم (٤-٥ مقابل ١-٢)
const twoGroups: SurveyResponse[] = [
  ...[5, 4, 5, 4, 5, 4, 5, 4].map((s, i) => mk("سنة ثالثة", s, 20 + (i % 3), i)),
  ...[1, 2, 1, 2, 1, 2, 1, 2].map((s, i) => mk("سنة رابعة", s, 21 + (i % 3), 100 + i)),
];

describe("buildColumns", () => {
  it("يبني أعمدة ليكرت والأرقام والفئات + الدرجة الكلية، ويتجاهل النص الحر", () => {
    const cols = buildColumns(qs, twoGroups);
    expect(cols[0].id).toBe(SCALE_ID);
    expect(cols.map((c) => c.id).sort()).toEqual([SCALE_ID, "age", "lvl", "sat1", "sat2", "sat3"].sort());
    expect(cols.find((c) => c.id === "lvl")).toMatchObject({ kind: "category", levels: ["سنة ثالثة", "سنة رابعة"] });
    expect(cols.find((c) => c.id === "sat1")).toMatchObject({ kind: "numeric", ordinal: true });
    expect(cols.find((c) => c.id === "free")).toBeUndefined();
  });
  it("ما يضيف الدرجة الكلية لو عبارات ليكرت أقل من ٣", () => {
    const cols = buildColumns(qs.filter((q) => q.id !== "sat3" && q.id !== "sat2"), twoGroups);
    expect(cols.find((c) => c.id === SCALE_ID)).toBeUndefined();
  });
});

describe("runPlan", () => {
  const cols = buildColumns(qs, twoGroups);
  const plan = (p: Partial<AskPlan> & Pick<AskPlan, "test">): AskPlan => ({ reason: "", ...p });

  it("يقارن مجموعتين بـ t ويلقط الفرق الواضح", () => {
    const r = runPlan(plan({ test: "compare_groups", outcome: "sat1", group: "lvl" }), cols, qs, twoGroups);
    if ("error" in r) throw new Error(r.error);
    expect(r.apa).toContain("وجود فرق ذي دلالة إحصائية");
    expect(r.table[1][0]).toBe("سنة ثالثة");
    expect(r.table[1][1]).toBe("8");
    expect(r.table[1][2]).toBe("4.5"); // متوسط (5+4)/2
  });

  it("يستخدم ANOVA لثلاث مجموعات أو أكثر", () => {
    const three = [...twoGroups, ...[3, 3, 3, 3].map((s, i) => mk("امتياز", s, 24, 200 + i))];
    const c3 = buildColumns(qs, three);
    const r = runPlan(plan({ test: "compare_groups", outcome: "sat1", group: "lvl" }), c3, qs, three);
    if ("error" in r) throw new Error(r.error);
    expect(r.apa).toContain("تحليل التباين الأحادي");
  });

  it("يستبعد المجموعات الصغيرة ويرفض لو بقي أقل من مجموعتين", () => {
    const tiny = [mk("سنة ثالثة", 5, 20, 1), mk("سنة ثالثة", 4, 20, 2), mk("سنة رابعة", 1, 21, 3)];
    const r = runPlan(plan({ test: "compare_groups", outcome: "sat1", group: "lvl" }), buildColumns(qs, tiny), qs, tiny);
    expect(r).toHaveProperty("error");
  });

  it("الارتباط مع ليكرت يستخدم سبيرمان ويشرح السبب", () => {
    const r = runPlan(plan({ test: "correlate", x: "sat1", y: "age" }), cols, qs, twoGroups);
    if ("error" in r) throw new Error(r.error);
    expect(r.table[1][0]).toContain("Spearman");
    expect(r.notes.join(" ")).toContain("سبيرمان");
  });

  it("الدرجة الكلية = متوسط عبارات ليكرت", () => {
    const r = runPlan(plan({ test: "describe", outcome: SCALE_ID }), cols, qs, twoGroups);
    if ("error" in r) throw new Error(r.error);
    // نص الردود ٤.٥ ونصها ١.٥ → المتوسط العام ٣
    expect(r.table[1][2]).toBe("3");
  });

  it("مربع كاي يشتغل لفئتين، ويرفض متغير رقمي", () => {
    const withGender = twoGroups.map((r, i) => ({ ...r, answers: { ...r.answers, g: i % 2 === 0 ? "أنثى" : "ذكر" } }));
    const q2: Question[] = [...qs, { id: "g", type: "single", text: "الجنس", options: ["أنثى", "ذكر"], required: true }];
    const c2 = buildColumns(q2, withGender);
    const ok = runPlan(plan({ test: "associate", x: "lvl", y: "g" }), c2, q2, withGender);
    expect("error" in ok).toBe(false);
    const bad = runPlan(plan({ test: "associate", x: "lvl", y: "sat1" }), c2, q2, withGender);
    expect(bad).toHaveProperty("error");
  });

  it("يرفض خطة فيها أعمدة غير موجودة أو نوع غير مناسب ولا يخترع نتيجة", () => {
    expect(runPlan(plan({ test: "compare_groups", outcome: "nope", group: "lvl" }), cols, qs, twoGroups)).toHaveProperty("error");
    expect(runPlan(plan({ test: "compare_groups", outcome: "lvl", group: "sat1" }), cols, qs, twoGroups)).toHaveProperty("error");
    expect(runPlan(plan({ test: "correlate", x: "sat1", y: "sat1" }), cols, qs, twoGroups)).toHaveProperty("error");
  });

  it("unsupported يرجّع سبب الذكاء كرسالة", () => {
    const r = runPlan(plan({ test: "unsupported", reason: "ما عندنا متغير الجنس." }), cols, qs, twoGroups);
    expect(r).toEqual({ error: "ما عندنا متغير الجنس." });
  });
});
