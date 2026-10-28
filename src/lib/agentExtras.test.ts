import { describe, expect, it } from "vitest";
import { buildStatus, isStatusQuestion, quickRepliesFor } from "./agentExtras";

describe("isStatusQuestion", () => {
  it("يلقط أسئلة الوضع", () => {
    expect(isStatusQuestion("وين وصلنا؟ وش أسوي اليوم؟")).toBe(true);
    expect(isStatusQuestion("وش اللي متأخر عندنا؟")).toBe(true);
    expect(isStatusQuestion("احفظ لي سؤال البحث")).toBe(false);
  });
});

describe("buildStatus", () => {
  it("يحسب النسبة والمتأخر وأقرب موعد", () => {
    const s = buildStatus({
      today: "2026-10-28",
      tasks: [
        { title: "أ", status: "done", dueDate: "2026-10-01" },
        { title: "ب", status: "todo", dueDate: "2026-10-20" },
        { title: "ج", status: "todo", dueDate: "2026-11-05" },
      ],
      stages: [{ titleAr: "مراجعة الأدبيات", status: "active", progress: 45, targetDate: null }],
      events: [{ title: "اجتماع", date: "2026-10-30", time: "09:00" }, { title: "قديم", date: "2026-10-01", time: "09:00" }],
    });
    expect(s).toMatchObject({ done: 1, total: 3, percent: 33, overdue: 1 });
    expect(s.nextEvent?.inDays).toBe(2);
    expect(s.nextTask?.title).toBe("ب");
    expect(s.stage?.progress).toBe(45);
  });
  it("لا يقسم على صفر", () => {
    expect(buildStatus({ today: "2026-10-28", tasks: [], stages: [], events: [] }).percent).toBe(0);
  });
});

describe("quickRepliesFor", () => {
  it("حد أقصى ٣ ومن غير تكرار", () => {
    const r = quickRepliesFor({ question: "", actionTypes: ["add_task", "add_questions", "add_event"], isLeader: true });
    expect(r.length).toBeLessThanOrEqual(3);
    expect(new Set(r.map((x) => x.label)).size).toBe(r.length);
  });
  it("العضو ما تطلع له أزرار القائد", () => {
    const r = quickRepliesFor({ question: "", actionTypes: ["add_task"], isLeader: false });
    expect(r.find((x) => x.label.includes("موعد مراجعة"))).toBeUndefined();
  });
});
