import { describe, expect, it } from "vitest";
import { addDays, daysBetween, proofProgress, radarOf, requestChips, waitingItems, weeklyVelocity, type Dash, type DashTask, type TeamData } from "./supervisorDash";
import type { SupItem } from "./commitments";

const today = "2026-11-12";
let n = 0;
const task = (p: Partial<DashTask>): DashTask => ({
  id: `t${n++}`,
  title: "مهمة",
  description: "",
  sectionKey: null,
  status: "todo",
  dueDate: null,
  completedAt: null,
  createdAt: "2026-10-01T09:00:00Z",
  assigneeId: "u1",
  assigneeName: "ريان",
  targetCount: null,
  source: null,
  ...p,
});
const doneOn = (d: string, extra: Partial<DashTask> = {}) => task({ status: "done", completedAt: `${d}T10:00:00+03:00`, ...extra });

describe("date helpers", () => {
  it("adds days and counts between ISO dates", () => {
    expect(addDays("2026-11-12", 5)).toBe("2026-11-17");
    expect(addDays("2026-11-28", 5)).toBe("2026-12-03");
    expect(daysBetween("2026-11-12", "2026-11-17")).toBe(5);
    expect(daysBetween("2026-11-17", "2026-11-12")).toBe(-5);
  });
});

describe("weeklyVelocity", () => {
  it("is the median of the last three weeks", () => {
    const tasks = [doneOn("2026-11-11"), doneOn("2026-11-10"), doneOn("2026-11-09"), doneOn("2026-11-03"), doneOn("2026-10-28")];
    // أسبوع ١: ٣ · أسبوع ٢: ١ · أسبوع ٣: ١ → الوسيط ١
    expect(weeklyVelocity(tasks, today)).toBe(1);
  });
  it("ignores open tasks and older work", () => {
    expect(weeklyVelocity([task({}), doneOn("2026-09-01")], today)).toBe(0);
  });
});

describe("proofProgress", () => {
  it("counts a done task only when its proof exists", () => {
    const dash = {
      tasks: [
        task({ status: "done", title: "ابحث عن 5 دراسات", sectionKey: "evidence" }),
        task({ status: "done", title: "اتصل بالمستشفى" }),
        task({ status: "todo" }),
        task({ status: "todo" }),
      ],
      papers: [{ addedById: "u1", lit: false }],
      sections: [],
    };
    // «٥ دراسات» عندها وحدة بس → ما تنحسب. المكالمة ما نقدر نقيسها → تنحسب
    expect(proofProgress(dash)).toEqual({ pct: 25, credited: 1, total: 4 });
  });
  it("is zero with no tasks", () => {
    expect(proofProgress({ tasks: [], papers: [], sections: [] }).pct).toBe(0);
  });
});

const dashWith = (tasks: DashTask[], deadline: string | null): Pick<Dash, "tasks" | "project" | "today"> => ({
  today,
  tasks,
  project: { title: "", startDate: "2026-10-01", deadline, createdAt: "2026-10-01T00:00:00Z" },
});

describe("radarOf", () => {
  it("is gold when the pace finishes well before the deadline", () => {
    const tasks = [doneOn("2026-11-11"), doneOn("2026-11-10"), doneOn("2026-11-04"), doneOn("2026-11-03"), doneOn("2026-10-28"), doneOn("2026-10-27"), task({}), task({})];
    const r = radarOf(dashWith(tasks, "2026-12-20"));
    expect(r.velocity).toBe(2);
    expect(r.finish).toBe("2026-11-19");
    expect(r.tone).toBe("gold");
    expect(r.alert).toBe(false);
  });
  it("flags a predicted miss and alerts within two weeks of the deadline", () => {
    const tasks = [doneOn("2026-11-10"), doneOn("2026-11-03"), doneOn("2026-10-27"), ...Array.from({ length: 4 }, () => task({}))];
    const r = radarOf(dashWith(tasks, "2026-11-20"));
    expect(r.velocity).toBe(1);
    expect(r.finish).toBe("2026-12-10");
    expect(r.slip).toBe(20);
    expect(r.tone).toBe("late");
    expect(r.alert).toBe(true);
    expect(r.pos.finish!).toBeGreaterThan(r.pos.deadline!);
  });
  it("is orange with no pace and no alert when the deadline is far", () => {
    const r = radarOf(dashWith([task({})], "2027-03-01"));
    expect(r.finish).toBeNull();
    expect(r.tone).toBe("orange");
    expect(r.alert).toBe(false);
  });
  it("is late once the deadline has passed with work left", () => {
    expect(radarOf(dashWith([task({})], "2026-11-01")).tone).toBe("late");
  });
  it("handles a missing deadline", () => {
    const r = radarOf(dashWith([task({})], null));
    expect(r.deadline).toBeNull();
    expect(r.pos.deadline).toBeNull();
  });
});

const item = (p: Partial<SupItem>): SupItem => ({
  id: `c${n++}`, direction: "from_supervisor", title: "طلب", quote: "", status: "approved", important: false, due_at: null, due_label: "", done_at: null, created_at: "2026-11-01T00:00:00Z",
  assignee: null, task_due: null, task_status: null, proof_name: null, has_proof: false, receipt_sent_at: null, receipt_ack_at: null, receipt_note: null, ...p,
});

describe("requestChips", () => {
  it("groups the supervisor's requests", () => {
    expect(requestChips([item({ status: "proposed" }), item({ status: "approved" }), item({ status: "in_progress" }), item({ status: "done" }), item({ direction: "to_team" }), item({ status: "dismissed" })])).toEqual({ waiting: 2, doing: 1, done: 1 });
  });
});

describe("waitingItems", () => {
  it("collects everything waiting for the supervisor, oldest first", () => {
    const team: TeamData = {
      token: "tok",
      name: "الاحتراق",
      state: "ok",
      board: { teamName: "الاحتراق", today, waiting: { minutes: [], decisions: [{ id: "d1", question: "نستخدم PSQI؟", options: ["ايه", "لا"], neededBy: null, createdAt: "2026-11-11T08:00:00Z" }], bookings: [] }, recentMinutes: [], lastMeeting: null, upcoming: [], availability: null },
      items: [item({ status: "done", done_at: "2026-11-10T08:00:00Z" })],
      dash: {
        ...dashWith([task({})], "2027-03-01"),
        teamName: "الاحتراق",
        members: [],
        papers: [],
        sections: [],
        bookings: [],
        lastTeamMessage: null,
        log: [],
        away: null,
        extensions: [
          { id: "e1", taskId: "t", taskTitle: "إرسال العينة", requestedBy: "ريان", currentDue: "2026-11-12", requestedDue: "2026-11-17", reason: "waiting_hospital", note: "", status: "pending", finalDue: null, supervisorNote: "", createdAt: "2026-11-12T08:00:00Z", resolvedAt: null },
          { id: "e2", taskId: "t", taskTitle: "قديم", requestedBy: "ريان", currentDue: null, requestedDue: "2026-11-17", reason: "exams", note: "", status: "approved", finalDue: "2026-11-17", supervisorNote: "", createdAt: "2026-11-01T08:00:00Z", resolvedAt: null },
        ],
      },
    };
    const w = waitingItems([team]);
    expect(w.map((x) => x.kind)).toEqual(["extension", "receipt", "decision"]);
    expect(w[0].to).toBe("?v=requests#ext-e1");
    expect(w[1].to).toContain("/supervisor/tok?open=receipt:");
  });
  it("skips teams that failed to load", () => {
    expect(waitingItems([{ token: "x", name: "", state: "error", dash: null, board: null, items: [] }])).toEqual([]);
  });
});
