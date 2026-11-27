import { describe, expect, it } from "vitest";
import { agoLabel, buildNeeds, canUndo, nextSuggestions, planRows, receiptLines, withEdits, type NeedsInput, type ReceiptItem } from "./agentPlan";

const base: NeedsInput = {
  today: "2026-11-13",
  isLeader: true,
  me: "m",
  members: [
    { id: "m", name: "مشاري" },
    { id: "k", name: "خالد" },
    { id: "r", name: "ريان" },
  ],
  questions: [],
  feedback: [],
  supervisorName: "د. إسراء",
  tasks: [],
  nextMeeting: null,
  sections: [{ key: "intro", ownerId: "m" }],
  deadline: "2026-12-30",
};

describe("buildNeeds", () => {
  it("is empty when nothing needs the team", () => {
    expect(buildNeeds(base)).toEqual([]);
  });

  it("caps at 3 cards, most important first", () => {
    const needs = buildNeeds({
      ...base,
      questions: ["1", "2", "3", "4", "5", "6", "7"],
      feedback: [{ id: "f1", comment: "عدّلوا البند 7", assigneeId: null, feedbackDate: "2026-11-10" }],
      nextMeeting: { title: "اجتماع الإشراف", date: "2026-11-17" },
      tasks: [{ id: "t1", title: "قديمة", assigneeId: "r", dueDate: "2026-11-01", status: "todo" }],
      deadline: null,
    });
    expect(needs.map((n) => n.id)).toEqual(["questions", "feedback-f1", "meeting"]);
    expect(needs[0].pill).toContain("7");
  });

  it("gives an orphan supervisor note to the lightest member as a ready plan (leader only)", () => {
    const tasks = [
      { id: "a", title: "x", assigneeId: "m", dueDate: "2026-11-20", status: "todo" },
      { id: "b", title: "y", assigneeId: "r", dueDate: "2026-11-20", status: "todo" },
    ];
    const [card] = buildNeeds({ ...base, tasks, feedback: [{ id: "f1", comment: "عدّلوا البند 7", assigneeId: null, feedbackDate: "2026-11-10" }] });
    expect(card.button).toContain("خالد");
    expect(card.go.kind).toBe("plan");
    if (card.go.kind === "plan") {
      expect(card.go.actions[0]).toMatchObject({ type: "add_task", assigneeId: "k", days: 2 });
    }
    const [member] = buildNeeds({ ...base, isLeader: false, tasks, feedback: [{ id: "f1", comment: "z", assigneeId: null, feedbackDate: "2026-11-10" }] });
    expect(member.go.kind).toBe("ask");
  });

  it("stops nagging about a note once a task with its text exists", () => {
    const fb = [{ id: "f1", comment: "عدّلوا البند 7", assigneeId: null, feedbackDate: "2026-11-10" }];
    expect(buildNeeds({ ...base, feedback: fb, tasks: [{ id: "t", title: "عدّلوا البند 7", assigneeId: "k", dueDate: "2026-11-15", status: "todo" }] })).toEqual([]);
  });

  it("ignores meetings more than a week away", () => {
    expect(buildNeeds({ ...base, nextMeeting: { title: "m", date: "2026-11-30" } })).toEqual([]);
  });
});

describe("planRows", () => {
  const ctx = { today: "2026-11-13", isLeader: true, canWrite: true, me: "m" };

  it("turns write actions into rows and skips links", () => {
    const rows = planRows(
      [
        { type: "add_task", title: "عبّوا الجدول", description: "", days: 3, assigneeId: "k" },
        { type: "open", to: "/tasks", label: "x" },
        { type: "set_aim", text: "هدف" },
      ],
      ctx,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ ownerId: "k", due: "2026-11-16", allowed: true });
  });

  it("blocks task creation for non-leaders", () => {
    const [row] = planRows([{ type: "add_task", title: "x", description: "", days: 1 }], { ...ctx, isLeader: false });
    expect(row.allowed).toBe(false);
    expect(row.blockedWhy).not.toBe("");
  });

  it("applies edits (owner + date) before running", () => {
    const [row] = planRows([{ type: "add_task", title: "x", description: "", days: 1, assigneeId: "k" }], ctx);
    expect(withEdits(row, { ownerId: "r", due: "2026-11-20" }, "2026-11-13")).toMatchObject({ assigneeId: "r", days: 7 });
  });
});

describe("receipt", () => {
  const item = (type: ReceiptItem["type"], label: string): ReceiptItem => ({ type, label, to: "/tasks", diff: {}, undo: { kind: "delete_task", id: label } });

  it("groups lines by kind with a link to each place", () => {
    const lines = receiptLines([item("add_task", "a"), item("add_task", "b"), item("add_event", "اجتماع")]);
    expect(lines).toHaveLength(2);
    expect(lines[0].to).toBe("/tasks");
    expect(lines[1].to).toBe("/calendar");
  });

  it("allows undo for 24 hours only, and only once", () => {
    const now = Date.parse("2026-11-13T12:00:00Z");
    const r = { createdAt: "2026-11-13T00:00:00Z", undoneAt: null, items: [item("add_task", "a")] };
    expect(canUndo(r, now)).toBe(true);
    expect(canUndo({ ...r, createdAt: "2026-11-12T11:00:00Z" }, now)).toBe(false);
    expect(canUndo({ ...r, undoneAt: "2026-11-13T01:00:00Z" }, now)).toBe(false);
    expect(canUndo({ ...r, items: [{ ...r.items[0], undo: { kind: "none" } }] }, now)).toBe(false);
  });

  it("labels time simply", () => {
    const now = Date.parse("2026-11-13T12:00:00Z");
    expect(agoLabel("2026-11-13T11:59:50Z", now)).toBe("قبل ثواني");
    expect(agoLabel("2026-11-13T10:00:00Z", now)).toBe("قبل ساعتين");
  });

  it("suggests exactly 2 next steps", () => {
    expect(nextSuggestions(["add_task"], { nextMeetingTitle: "اجتماع", busiestName: "ريان" })).toHaveLength(2);
    expect(nextSuggestions([], {})).toHaveLength(2);
  });
});
