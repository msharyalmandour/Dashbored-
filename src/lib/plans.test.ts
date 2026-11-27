import { describe, expect, it } from "vitest";
import { daysForPayment, perMonth, personPrice, planSaving, teamMonthlyTotal } from "./plans";

describe("per-person pricing", () => {
  it("prices and savings", () => {
    expect(personPrice("month")).toBe(15);
    expect(personPrice("month", true)).toBe(12);
    expect(personPrice("year", true)).toBe(99);
    expect(planSaving("year")).toBe(36);
    expect(planSaving("semester")).toBe(11);
    expect(perMonth("year")).toBe(11);
    expect(teamMonthlyTotal(4)).toBe(60);
  });
  it("days a payment buys for the team", () => {
    // كل الفريق (4) دفع الشهري = 30 يوم
    expect(daysForPayment(60, "month", 4)).toBe(30);
    // واحد من 4 دفع حصته الشهرية ≈ أسبوع
    expect(daysForPayment(15, "month", 4)).toBe(8);
    // واحد من 4 دفع السنة الدراسية = ربع 270
    expect(daysForPayment(99, "year", 4)).toBe(68);
    expect(daysForPayment(396, "year", 4)).toBe(270);
    // لحاله، فصل
    expect(daysForPayment(49, "semester", 1)).toBe(120);
    // خصم الاستمرار: 12 للشخص يشتري نفس الأيام
    expect(daysForPayment(48, "month", 4, true)).toBe(30);
  });
});
