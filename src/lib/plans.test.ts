import { describe, expect, it } from "vitest";
import { daysForPayment, perMonth, personPrice, planSaving, teamMonthlyTotal, tierOf } from "./plans";

describe("التسعيرة للطالب (2026-11-27)", () => {
  it("الشرائح", () => {
    expect(tierOf(1)).toBe("solo");
    expect(tierOf(4)).toBe("team");
    expect(tierOf(4, true)).toBe("founding");
    expect(tierOf(1, true, "legacy")).toBe("legacy");
  });
  it("الأسعار والتوفير", () => {
    expect(personPrice("month", false, "solo")).toBe(37);
    expect(personPrice("month")).toBe(29);
    expect(personPrice("month", false, "founding")).toBe(27);
    expect(personPrice("month", true)).toBe(26);
    expect(personPrice("year", true)).toBe(199);
    expect(personPrice("month", false, "legacy")).toBe(15);
    expect(planSaving("year")).toBe(62);
    expect(planSaving("semester", "founding")).toBe(19);
    expect(perMonth("year", "legacy")).toBe(11);
    expect(teamMonthlyTotal(4)).toBe(116);
    expect(teamMonthlyTotal(4, true)).toBe(108);
    expect(teamMonthlyTotal(1)).toBe(37);
    expect(teamMonthlyTotal(4, false, "legacy")).toBe(60);
  });
  it("كم يوم تمدد الدفعة للفريق", () => {
    expect(daysForPayment(116, "month", 4)).toBe(30);
    expect(daysForPayment(29, "month", 4)).toBe(8);
    expect(daysForPayment(199 * 4, "year", 4)).toBe(270);
    expect(daysForPayment(129, "semester", 1, false, "solo")).toBe(120);
    expect(daysForPayment(26 * 4, "month", 4, true)).toBe(30);
    expect(daysForPayment(60, "month", 4, false, "legacy")).toBe(30);
  });
});
