import { describe, expect, it } from "vitest";
import { addDays, normalize, normalizePhone, parseCommand, riyadhDate, riyadhHour, templateSafe } from "./parse";

describe("whatsapp parseCommand", () => {
  it("links with a code", () => {
    expect(parseCommand("ربط ab12cd")).toEqual({ kind: "link", code: "AB12CD" });
    expect(parseCommand("  ربط   AB12CD ")).toEqual({ kind: "link", code: "AB12CD" });
  });

  it("done with and without a number (Arabic digits too)", () => {
    expect(parseCommand("تم")).toEqual({ kind: "done", n: undefined });
    expect(parseCommand("تم ✓")).toEqual({ kind: "done", n: undefined });
    expect(parseCommand("تم ٢")).toEqual({ kind: "done", n: 2 });
    expect(parseCommand("خلصت 3")).toEqual({ kind: "done", n: 3 });
  });

  it("snooze: task number, days, day words", () => {
    expect(parseCommand("أجّل")).toEqual({ kind: "snooze", n: undefined, days: 1 });
    expect(parseCommand("اجل 2")).toEqual({ kind: "snooze", n: 2, days: 1 });
    expect(parseCommand("أجل 2 يومين")).toEqual({ kind: "snooze", n: 2, days: 2 });
    expect(parseCommand("أجل ٣ أيام")).toEqual({ kind: "snooze", n: undefined, days: 3 });
    expect(parseCommand("أجل 1 5")).toEqual({ kind: "snooze", n: 1, days: 5 });
    expect(parseCommand("أجلها اسبوع")).toEqual({ kind: "snooze", n: undefined, days: 7 });
    expect(parseCommand("أجل 1 99")).toEqual({ kind: "snooze", n: 1, days: 30 });
  });

  it("buttons carry the task id, and only real ids are trusted", () => {
    const id = "0b9c4a52-1f2e-4c1d-9a8b-7c6d5e4f3a21";
    expect(parseCommand(`done:${id}`)).toEqual({ kind: "done", taskId: id });
    expect(parseCommand(`snooze:${id}`)).toEqual({ kind: "snooze", days: 1, taskId: id });
    expect(parseCommand("done:'; drop table tasks")).toEqual({ kind: "help" });
    expect(parseCommand("list")).toEqual({ kind: "list" });
  });

  it("list, pause, resume, help", () => {
    expect(parseCommand("مهامي")).toEqual({ kind: "list" });
    expect(parseCommand("وش علي؟")).toEqual({ kind: "list" });
    expect(parseCommand("وقف")).toEqual({ kind: "pause" });
    expect(parseCommand("ابدأ")).toEqual({ kind: "resume" });
    expect(parseCommand("السلام عليكم")).toEqual({ kind: "help" });
  });
});

describe("whatsapp helpers", () => {
  it("normalizes Arabic text", () => {
    expect(normalize("أجّـــل  ٢")).toBe("اجل 2");
  });
  it("normalizes phone numbers", () => {
    expect(normalizePhone("+966 50 123 4567")).toBe("966501234567");
    expect(normalizePhone("00966501234567")).toBe("966501234567");
  });
  it("uses Riyadh dates and hours", () => {
    const lateUtc = new Date("2026-11-26T22:30:00Z"); // 01:30 الرياض اليوم الثاني
    expect(riyadhDate(0, lateUtc)).toBe("2026-11-27");
    expect(riyadhHour(lateUtc)).toBe(1);
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });
  it("keeps template variables single-line", () => {
    expect(templateSafe("a\nb\n\nc     d")).toBe("a · b · c   d");
  });
});
