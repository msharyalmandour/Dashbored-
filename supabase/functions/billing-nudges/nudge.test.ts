import { describe, expect, it } from "vitest";
import { coveredIds, joinNames, nudgeKind, nudgeMessage } from "./nudge";

describe("billing nudges", () => {
  it("picks the reminder for the day", () => {
    expect(nudgeKind(7, false)).toBe("pre7");
    expect(nudgeKind(0, true)).toBe("day0"); // يوم الانتهاء يغلب يوم المكافأة
    expect(nudgeKind(-3, false)).toBe("post3");
    expect(nudgeKind(-7, false)).toBe("post7");
    expect(nudgeKind(12, true)).toBe("payday");
    expect(nudgeKind(40, true)).toBeNull();
    expect(nudgeKind(-45, true)).toBeNull();
    expect(nudgeKind(5, false)).toBeNull();
  });

  it("joins Arabic names", () => {
    expect(joinNames(["نورة"])).toBe("نورة");
    expect(joinNames(["نورة", "أحمد"])).toBe("نورة وأحمد");
    expect(joinNames(["نورة", "أحمد", "سارة"])).toBe("نورة، أحمد وسارة");
  });

  it("writes a personal, social, non-threatening day-0 message", () => {
    const m = nudgeMessage({ kind: "day0", firstName: "سارة", female: true, teamName: "بحث الهذيان", paidNames: ["نورة", "أحمد"], onTrial: false, endLabel: "" });
    expect(m.body).toContain("سارة");
    expect(m.body).toContain("حصص نورة وأحمد مدفوعة");
    expect(m.body).not.toMatch(/بتخسر|تخسر/);
  });

  it("frames the follow-up as a choice, in the right gender", () => {
    expect(nudgeMessage({ kind: "post3", firstName: "سارة", female: true, teamName: "x", paidNames: [], onTrial: false, endLabel: "" }).body).toContain("اختاري");
    expect(nudgeMessage({ kind: "post3", firstName: "خالد", female: false, teamName: "x", paidNames: [], onTrial: false, endLabel: "" }).body).toContain("اختر");
  });

  it("knows who is covered", () => {
    const now = new Date("2026-11-27T12:00:00Z").getTime();
    const ids = coveredIds([{ profile_id: "a", period: "year", created_at: "2026-05-01T00:00:00Z" }], ["a", "b"], now);
    expect([...ids]).toEqual(["a"]);
  });
});
