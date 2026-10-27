import { describe, expect, it } from "vitest";
import { consistencyIssues, proactiveNudges, similarity, watchAll, type WatchInput } from "./agentWatch";

const base: WatchInput = {
  today: "2026-10-27",
  aim: "",
  questions: [],
  tasks: [],
  stages: [],
  feedbackOpen: [],
  isLeader: true,
};
const ids = (n: { id: string }[]) => n.map((x) => x.id);

describe("consistencyIssues", () => {
  it("يعطي تنبيه لو أسئلة بدون هدف وبالعكس", () => {
    expect(ids(consistencyIssues("", ["ما أثر النوم على الأداء؟"]))).toContain("no-aim");
    expect(ids(consistencyIssues("نهدف إلى تقييم أثر النوم", []))).toContain("no-questions");
  });
  it("يكشف الهدف المطابق للسؤال", () => {
    expect(ids(consistencyIssues("ما أثر النوم على الأداء الأكاديمي", ["ما أثر النوم على الأداء الأكاديمي؟"]))).toContain("aim-equals-question");
  });
  it("هدف وسؤال سليمين ما يطلع عليهم شي", () => {
    expect(consistencyIssues("نهدف إلى تقييم أثر قلة النوم على الأداء الأكاديمي لطلاب التمريض", ["هل توجد علاقة بين ساعات النوم والمعدل؟"])).toEqual([]);
  });
  it("يحذر من كثرة الأسئلة", () => {
    const qs = Array.from({ length: 6 }, (_, i) => `سؤال النوم رقم ${i}`);
    expect(ids(consistencyIssues("هدف النوم", qs))).toContain("too-many-questions");
  });
});

describe("similarity", () => {
  it("يتجاهل التشكيل والهمزات", () => {
    expect(similarity("أثرُ النوم", "اثر النوم")).toBe(1);
  });
});

describe("proactiveNudges", () => {
  it("يعد المتأخرة ويستثني المنجزة", () => {
    const n = proactiveNudges({
      ...base,
      tasks: [
        { title: "أ", assigneeId: "u1", dueDate: "2026-10-01", status: "todo" },
        { title: "ب", assigneeId: "u1", dueDate: "2026-10-01", status: "done" },
      ],
    });
    expect(ids(n)).toContain("overdue");
    expect(n.find((x) => x.id === "overdue")?.text).toContain("1");
  });
  it("المهام بدون مسؤول تظهر للقائد بس", () => {
    const tasks = [{ title: "أ", assigneeId: "", dueDate: "2026-12-01", status: "todo" }];
    expect(ids(proactiveNudges({ ...base, tasks }))).toContain("unassigned");
    expect(ids(proactiveNudges({ ...base, tasks, isLeader: false }))).not.toContain("unassigned");
  });
  it("التسليم القريب والملاحظات المفتوحة", () => {
    const n = proactiveNudges({ ...base, submissionDate: "2026-11-05", feedbackOpen: [{ assigneeId: null }] });
    expect(ids(n)).toEqual(expect.arrayContaining(["submission-soon", "feedback-open"]));
    expect(n.find((x) => x.id === "submission-soon")?.level).toBe("warn");
  });
  it("مرحلة تجاوزت تاريخها", () => {
    expect(ids(proactiveNudges({ ...base, stages: [{ targetDate: "2026-10-01", progress: 40, status: "in-progress" }] }))).toContain("stage-late");
  });
});

describe("watchAll", () => {
  it("يرتب التحذيرات قبل المعلومات", () => {
    const n = watchAll({ ...base, aim: "", questions: ["ما أثر النوم؟"], feedbackOpen: [{ assigneeId: null }] });
    expect(n[0].level).toBe("warn");
  });
});
