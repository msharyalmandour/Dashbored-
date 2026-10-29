import { describe, expect, it } from "vitest";
import { paceStatus, streakDays, timeLeft, todayList, weeklyImprovement, todoList, weeklySeries } from "./homeCalm";

const t = (id: string, dueDate: string, status = "todo", completedAt: string | null = null) => ({ id, title: id, status, dueDate, assigneeId: "a", completedAt });
const today = "2026-10-28";

describe("streakDays", () => {
  it("يعد الأيام المتتالية لين اليوم أو أمس", () => {
    expect(streakDays(["2026-10-28T10:00", "2026-10-27T09:00", "2026-10-26T08:00", "2026-10-24T08:00"], today)).toBe(3);
    expect(streakDays(["2026-10-27T09:00", "2026-10-26T08:00"], today)).toBe(2);
    expect(streakDays(["2026-10-25T09:00"], today)).toBe(0);
  });
});

describe("todayList", () => {
  it("المتأخر أول ثم اليوم، ٣ بالكثير", () => {
    const l = todayList([t("today", today), t("late2", "2026-10-20"), t("future", "2026-11-05"), t("late1", "2026-10-10"), t("done", "2026-10-01", "done")], today);
    expect(l.map((x) => x.id)).toEqual(["late1", "late2", "today"]);
  });
});

describe("paceStatus", () => {
  it("متأخرين لو فيه متأخرة، ويحسب كم مهمة بالأسبوع", () => {
    const p = paceStatus([t("a", "2026-10-20"), t("b", "2026-11-01"), t("c", "2026-11-10"), t("d", "2026-11-15")], today, 21);
    expect(p.onTrack).toBe(false);
    expect(p.perWeek).toBe(2);
    expect(p.thisWeek.map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("ماشين صح لو خلّصوا المطلوب هالأسبوع", () => {
    const p = paceStatus([t("x", "2026-10-25", "done", "2026-10-27T10:00"), t("y", "2026-10-26", "done", "2026-10-26T10:00"), t("b", "2026-11-01"), t("c", "2026-11-10")], today, 14);
    expect(p.onTrack).toBe(true);
  });
});

describe("weeklyImprovement", () => {
  it("يطلع بس لو فيه تحسّن", () => {
    const tasks = [t("1", "", "done", "2026-10-27T10:00"), t("2", "", "done", "2026-10-25T10:00"), t("3", "", "done", "2026-10-18T10:00")];
    expect(weeklyImprovement(tasks, today)).toEqual({ thisWeek: 2, diff: 1 });
    expect(weeklyImprovement([t("3", "", "done", "2026-10-18T10:00")], today)).toBeNull();
  });
});

describe("timeLeft", () => {
  it("أيام وساعات بس", () => {
    expect(timeLeft("2026-10-30", new Date("2026-10-28T20:00:00"))).toEqual({ days: 2, hours: 3 });
  });
});

describe("todoList", () => {
  const tasks = [
    t("next", "2026-10-30"),
    t("today", today),
    t("late", "2026-10-25"),
    t("doneToday", "2026-10-26", "done", `${today}T09:00`),
    t("doneOld", "2026-10-20", "done", "2026-10-20T09:00"),
  ];
  it("المنجزة اليوم أول، ثم المتأخرة، ثم اليوم، ثم الجاية — والعداد من مهام اليوم بس", () => {
    const r = todoList(tasks, today);
    expect(r.items.map((x) => x.task.id)).toEqual(["doneToday", "late", "today", "next"]);
    expect(r.items.map((x) => x.kind)).toEqual(["done", "late", "today", "next"]);
    expect(r).toMatchObject({ done: 1, total: 3 });
  });
  it("المهمة اللي انضغطت تبقى بمكانها وتنحسب خلصت اليوم", () => {
    const ticked = tasks.map((x) => (x.id === "late" ? { ...x, status: "done", completedAt: null } : x));
    const r = todoList(ticked, today, { doneToday: new Set(["late"]), pinned: new Map([["late", "late"]]) });
    expect(r.items.map((x) => x.task.id)).toEqual(["doneToday", "late", "today", "next"]);
    expect(r).toMatchObject({ done: 2, total: 3 });
  });
  it("أقصى عدد", () => {
    expect(todoList(tasks, today, { limit: 2 }).items).toHaveLength(2);
  });
});

describe("weeklySeries", () => {
  it("الأسبوع الأخير ينتهي اليوم، والمخلّصة بدون تاريخ إكمال تنحسب على موعدها", () => {
    const tasks = [t("a", "2026-10-27", "done", "2026-10-27T10:00"), t("b", "2026-10-20", "done", null), t("c", "2026-10-28"), t("d", "2026-10-10")];
    expect(weeklySeries(tasks, today, 2)).toEqual([
      { done: 1, planned: 1 },
      { done: 1, planned: 2 },
    ]);
  });
});
