import { describe, expect, it } from "vitest";
import { addDaysISO, formatDateFull, formatHijri, formatMonthYear, formatTimestampLong, isValidISODate, relativeDayLabel } from "./date";

describe("date helpers", () => {
  it("validates real calendar dates only", () => {
    expect(isValidISODate("2026-10-21")).toBe(true);
    expect(isValidISODate("2026-02-31")).toBe(false);
    expect(isValidISODate("2026-13-01")).toBe(false);
    expect(isValidISODate("")).toBe(false);
    expect(isValidISODate("21/10/2026")).toBe(false);
  });
  it("formats weekday + long date", () => {
    expect(formatDateFull("2026-10-21")).toBe("الأربعاء 21 أكتوبر 2026");
    expect(formatDateFull("garbage")).toBe("garbage");
    expect(formatMonthYear("2026-10-21")).toBe("أكتوبر 2026");
  });
  it("gives a Hijri date or an empty string, never throws", () => {
    expect(formatHijri("nope")).toBe("");
    const h = formatHijri("2026-10-21");
    expect(h === "" || h.includes("هـ")).toBe(true);
  });
  it("shifts days across month/year boundaries", () => {
    expect(addDaysISO("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysISO("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("labels relative days", () => {
    const now = new Date(2026, 9, 21, 15, 0);
    expect(relativeDayLabel("2026-10-21", now)).toBe("اليوم");
    expect(relativeDayLabel("2026-10-20", now)).toBe("أمس");
    expect(relativeDayLabel("2026-10-19", now)).toBe("قبل يومين");
    expect(relativeDayLabel("2026-10-16", now)).toBe("قبل 5 أيام");
    expect(relativeDayLabel("2026-09-01", now)).toBe("قبل 50 يوم");
  });
});

describe("formatTimestampLong", () => {
  it("يتعامل مع وقت كامل من القاعدة بدون NaN", () => {
    expect(formatTimestampLong("2026-10-23T13:10:00.000Z")).toMatch(/^\d{1,2} أكتوبر 2026$/);
  });
  it("قيمة غير صالحة ترجع نص فاضي", () => {
    expect(formatTimestampLong("")).toBe("");
    expect(formatTimestampLong("غير تاريخ")).toBe("");
  });
});
