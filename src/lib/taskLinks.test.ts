import { describe, expect, it } from "vitest";
import { inferPlace, placeOf, proofFor, strictReview, targetCount } from "./taskLinks";
import type { Task } from "../data/types";

const task = (p: Partial<Task>): Task => ({ id: "t", title: "", description: "", assigneeId: "a", dueDate: "2026-11-02", status: "todo", priority: "medium", ...p });

describe("taskLinks", () => {
  it("infers the place from Arabic titles", () => {
    expect(inferPlace("ابحث عن 5 دراسات سابقة متعلقة بالبحث")).toBe("evidence");
    expect(inferPlace("عبّوا جدول الأدبيات")).toBe("literature");
    expect(inferPlace("اكتب خلفية البحث")).toBe("background");
    expect(inferPlace("جهّز ملف اللجنة الأخلاقية")).toBe("ethics");
    expect(inferPlace("يوجد الاوقات والتواريخ المختلفه للاجتماعات")).toBe("meetings");
    expect(inferPlace("حدد حجم العينة")).toBe("methodology");
    expect(inferPlace("اشتر قهوة")).toBeNull();
  });
  it("reads target counts in digits and words", () => {
    expect(targetCount("ابحث عن 5 دراسات سابقة")).toBe(5);
    expect(targetCount("ابحث عن ٣ دراسات")).toBe(3);
    expect(targetCount("جيب خمس دراسات سعودية")).toBe(5);
    expect(targetCount("دراستين عن الاحتراق")).toBe(2);
    expect(targetCount("اكتب الخلفية")).toBeNull();
  });
  it("prefers the stored place over inference", () => {
    expect(placeOf(task({ title: "ابحث عن دراسات", sectionKey: "gap" }))?.key).toBe("gap");
  });
  it("measures proof from real papers by the assignee", () => {
    const papers = [{ addedById: "a", country: "", aim: "", sample: "", dataCollection: "" }, { addedById: "b", country: "SA", aim: "", sample: "", dataCollection: "" }];
    const p = proofFor(task({ title: "ابحث عن 5 دراسات" }), { papers, sections: [] })!;
    expect(p).toMatchObject({ have: 1, need: 5, met: false });
  });
  it("uses the stored target count from a drop over the title", () => {
    const papers = [{ addedById: "a", country: "", aim: "", sample: "", dataCollection: "" }];
    const p = proofFor({ ...task({ title: "جيبوا دراسات عن الاحتراق", sectionKey: "evidence" }), targetCount: 3 }, { papers, sections: [] })!;
    expect(p).toMatchObject({ have: 1, need: 3, met: false });
  });
  it("flags done-without-proof, duplicates, missing owners and deadline", () => {
    const t = (i: number, status: Task["status"]) => task({ id: `t${i}`, title: "ابحث عن 5 دراسات سابقة متعلقة بالبحث", status, assigneeId: `m${i}` });
    const issues = strictReview({
      tasks: [t(1, "done"), t(2, "done"), t(3, "done"), t(4, "in-progress")],
      papers: [],
      sections: [{ key: "background", content: "", ownerId: "", status: "not-started" }],
      deadline: null,
      today: "2026-11-07",
      nameOf: (id) => id,
    });
    expect(issues.map((i) => i.id)).toEqual(["unproven", "dup", "late", "owners", "deadline"]);
    expect(issues[0].count).toBe(3);
    expect(issues[1].count).toBe(4);
  });
});
