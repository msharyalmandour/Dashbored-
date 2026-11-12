import { describe, expect, it } from "vitest";
import { attendanceSummary, buildMinutes, clock, forgotten, mentioned, ringPct } from "./minutesLive";

describe("meeting mode", () => {
  it("clock and ring update per minute, capped", () => {
    expect(clock(22 * 60000 + 14000)).toBe("22:14");
    expect(ringPct(22 * 60000 + 59000, 30)).toBeCloseTo(22 / 30);
    expect(ringPct(45 * 60000, 30)).toBe(1);
  });
  it("builds minutes sections from tagged captures", () => {
    const m = buildMinutes({
      captures: [
        { id: "1", at: "", by: "k", tag: "point", text: "العينة الحالية ٨٠ قليلة" },
        { id: "2", at: "", by: "d", tag: "decision", text: "نرفعها لـ ١٢٠" },
        { id: "3", at: "", by: "r", tag: "task", text: "أرسل المحضر للدكتورة" },
        { id: "4", at: "", by: "a", tag: "question", text: "MBI أو CBI؟" },
        { id: "5", at: "", by: null, tag: "task", text: "تعديل البند ٧", linkTaskId: "t7" },
      ],
    });
    expect(m.discussion).toBe("العينة الحالية ٨٠ قليلة");
    expect(m.decisions).toBe("نرفعها لـ ١٢٠");
    expect(m.tasks.map((t) => t.text)).toEqual(["أرسل المحضر للدكتورة", "تعديل البند ٧"]);
    expect(m.tasks[0].assigneeId).toBe("r");
    expect(m.tasks[1].linkTaskId).toBe("t7");
    expect(m.open).toBe("MBI أو CBI؟");
  });
  it("finds supervisor requests the minutes forgot", () => {
    expect(mentioned("إرسال العينة النهائية قبل الخميس", "اتفقنا نرسل العينة النهائية للدكتورة قبل الخميس")).toBe(true);
    expect(mentioned("تعديل صياغة البند ٧", "العينة ١٢٠ ممرض")).toBe(false);
    const f = forgotten(
      [
        { id: "a", title: "إرسال العينة النهائية", status: "approved", direction: "from_supervisor" },
        { id: "b", title: "تعديل صياغة البند ٧", status: "in_progress", direction: "from_supervisor" },
        { id: "c", title: "قديم", status: "done", direction: "from_supervisor" },
        { id: "d", title: "وعد", status: "approved", direction: "to_team" },
      ],
      "نرسل العينة النهائية",
    );
    expect(f.map((x) => [x.item.id, x.covered])).toEqual([["a", true], ["b", false]]);
  });
  it("attendance summary", () => {
    const s = attendanceSummary([{ id: "1", name: "م", joinedAt: "x" }, { id: "2", name: "ر", joinedAt: null }], "2026-11-09T07:00:00Z", "2026-11-09T07:22:00Z");
    expect(s).toEqual({ came: 1, total: 2, minutes: 22 });
  });
});
