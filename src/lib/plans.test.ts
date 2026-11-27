import { describe, expect, it } from "vitest";
import { perMemberMonthly, perMemberResearch, researchSaving, teamMonthlyTotal, teamResearchTotal } from "./plans";

describe("التسعيرة للطالب (2026-11-27)", () => {
  it("لحالك 37 بالشهر و249 للبحث كامل", () => {
    expect(teamMonthlyTotal("ai", false, 1)).toBe(37);
    expect(teamResearchTotal(false, 1)).toBe(249);
  });
  it("الفريق 29 للطالب، والمؤسسين 27", () => {
    expect(teamMonthlyTotal("ai", false, 4)).toBe(116);
    expect(teamMonthlyTotal("ai", true, 4)).toBe(108);
    expect(perMemberMonthly(2, true)).toBe(27);
  });
  it("الباقة ما تتغير بنوع الخطة (الوكيل داخل السعر)", () => {
    expect(teamMonthlyTotal("basic", false, 3)).toBe(teamMonthlyTotal("ai", false, 3));
  });
  it("باقة البحث كامل أوفر من 8 شهور شهري", () => {
    expect(perMemberResearch(4, true)).toBe(179);
    expect(teamResearchTotal(false, 5)).toBe(995);
    for (const [m, f] of [[1, false], [3, false], [3, true]] as const) expect(researchSaving(m, f)).toBeGreaterThan(0);
  });
});
