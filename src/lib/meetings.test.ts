import { describe, expect, it } from "vitest";
import type { DecisionRequestRow, MinutesActionRow, Task } from "../data/types";
import { actionProgress, buildReadiness, effectiveApproval, generateSlots, stageQuestions, supervisorLink } from "./meetings";

const H = 3600_000;
const now = new Date(2026, 9, 25, 9, 0); // الأحد 25 أكتوبر 2026، 9:00

const task = (id: string, status: Task["status"], dueDate = "2026-11-01"): Task =>
  ({ id, title: `مهمة ${id}`, description: "", assigneeId: "u1", dueDate, status, priority: "medium" }) as Task;
const action = (id: string, taskId: string | null, text = `بند ${id}`): MinutesActionRow => ({ id, minutesId: "m1", text, assigneeId: "u1", dueDate: null, taskId });

describe("effectiveApproval", () => {
  it("has no status without a request", () => expect(effectiveApproval(undefined)).toBe("none"));
  it("stays pending inside the 48h window", () => {
    expect(effectiveApproval({ status: "pending", requestedAt: new Date(now.getTime() - 47 * H).toISOString() }, now.getTime())).toBe("pending");
  });
  it("becomes auto_approved after 48h of silence", () => {
    expect(effectiveApproval({ status: "pending", requestedAt: new Date(now.getTime() - 49 * H).toISOString() }, now.getTime())).toBe("auto_approved");
  });
  it("keeps the supervisor's explicit decision", () => {
    expect(effectiveApproval({ status: "changes_requested", requestedAt: new Date(now.getTime() - 99 * H).toISOString() }, now.getTime())).toBe("changes_requested");
  });
});

describe("actionProgress", () => {
  it("counts actions whose task is done", () => {
    const r = actionProgress([action("a", "t1"), action("b", "t2"), action("c", null)], [task("t1", "done"), task("t2", "todo")]);
    expect(r).toEqual({ total: 3, done: 1 });
  });
});

describe("generateSlots", () => {
  const av = { windows: [{ weekday: 0, start: "10:00", end: "11:30" }, { weekday: 2, start: "13:00", end: "14:00" }], slotMinutes: 30 };
  it("expands windows into aligned slots on matching weekdays", () => {
    const days = generateSlots(av, [], "2026-10-25", 3, now);
    expect(days[0]).toEqual({ date: "2026-10-25", times: ["10:00", "10:30", "11:00"] });
    expect(days[1]).toEqual({ date: "2026-10-27", times: ["13:00", "13:30"] });
  });
  it("skips past times today and booked slots", () => {
    const late = new Date(2026, 9, 25, 10, 20);
    const days = generateSlots(av, [{ date: "2026-10-27", time: "13:00", status: "confirmed" }], "2026-10-25", 3, late);
    expect(days.find((d) => d.date === "2026-10-25")?.times).toEqual(["11:00"]);
    expect(days.find((d) => d.date === "2026-10-27")?.times).toEqual(["13:30"]);
  });
  it("frees a slot when its booking was declined", () => {
    const days = generateSlots(av, [{ date: "2026-10-27", time: "13:00", status: "declined" }], "2026-10-25", 3, now);
    expect(days.find((d) => d.date === "2026-10-27")?.times).toContain("13:00");
  });
  it("returns nothing when no windows are set", () => {
    expect(generateSlots({ windows: [], slotMinutes: 30 }, [], "2026-10-25", 14, now)).toEqual([]);
    expect(generateSlots(null, [], "2026-10-25", 14, now)).toEqual([]);
  });
});

describe("buildReadiness", () => {
  const decision = { id: "d1", question: "نبدأ بالمنهج الكمي؟", options: ["نعم", "لا"], status: "open" } as DecisionRequestRow;
  it("lists open actions, overdue tasks, open decisions and stage questions", () => {
    const r = buildReadiness({
      today: "2026-10-25",
      lastActions: [action("a", "t1"), action("b", "t2", "نجمع الدراسات")],
      tasks: [task("t1", "done"), task("t2", "todo"), task("t3", "overdue", "2026-10-01")],
      memberName: () => "سارة",
      openDecisions: [decision],
      stageKey: "methodology",
    });
    expect(r.doneCount).toBe(1);
    expect(r.openActions.map((a) => a.id)).toEqual(["b"]);
    expect(r.overdueTasks.map((t) => t.id)).toEqual(["t3"]);
    expect(r.agendaText).toContain("1 من 2 منجزة");
    expect(r.agendaText).toContain("نجمع الدراسات");
    expect(r.agendaText).toContain("نبدأ بالمنهج الكمي؟");
    expect(r.questions).toEqual(stageQuestions("methodology"));
    expect(r.isEmpty).toBe(false);
  });
  it("is empty (only questions) for a brand-new team", () => {
    const r = buildReadiness({ today: "2026-10-25", lastActions: [], tasks: [], memberName: () => "", openDecisions: [] });
    expect(r.isEmpty).toBe(true);
    expect(r.agendaText).toContain("أسئلتنا للمشرف/ة");
  });
});

describe("supervisorLink", () => {
  it("builds the hash route without double slashes", () => {
    expect(supervisorLink("https://dashbored-sigma.vercel.app/", "abc")).toBe("https://dashbored-sigma.vercel.app/#/supervisor/abc");
  });
});
