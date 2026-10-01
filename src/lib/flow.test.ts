import { describe, expect, it } from "vitest";
import type { ResearchStageRow, Task } from "../data/types";
import { isStageReady, nextStageOf, previousStageOf } from "./stageAdvance";
import { computeNextSteps } from "./nextSteps";
import { getStageAutoProgress } from "./progress";
import { parseSampleSize, summarizeCollection } from "./dataCollection";
import { buildSeen, diffSince } from "./supervisorLocal";

const stage = (stageKey: string, order: number, status: ResearchStageRow["status"] = "upcoming") =>
  ({ id: stageKey, stageKey, titleAr: stageKey, titleEn: stageKey, order, status, progress: 0, startDate: null, targetDate: null, completedDate: null }) as ResearchStageRow;
const stages = [stage("topic", 1), stage("proposal", 2), stage("literature-review", 3)];

describe("stage advance", () => {
  it("topic is ready only once the title is written", () => {
    expect(isStageReady(stages[0], {}, "")).toBe(false);
    expect(isStageReady(stages[0], {}, "   ")).toBe(false);
    expect(isStageReady(stages[0], {}, "أثر برنامج تدريبي")).toBe(true);
  });
  it("finds neighbours", () => {
    expect(nextStageOf(stages, stages[0])?.stageKey).toBe("proposal");
    expect(nextStageOf(stages, stages[2])).toBeUndefined();
    expect(previousStageOf(stages, stages[0])).toBeUndefined();
    expect(previousStageOf(stages, stages[1])?.stageKey).toBe("topic");
  });
  it("manual-only stages are never auto-ready", () => {
    expect(isStageReady(stage("analysis", 8), {}, "x")).toBe(false);
  });
});

describe("next steps", () => {
  const base = { todayIso: "2026-10-01", currentUserId: "u1", tasks: [] as Task[], stages, sections: [], hasDeadline: true };
  it("drops the stage nudge when the stage is ready", () => {
    expect(computeNextSteps(base).map((s) => s.id)).toContain("stage-topic");
    expect(computeNextSteps({ ...base, stageReady: true }).map((s) => s.id)).not.toContain("stage-topic");
  });
  it("deep-links a single late task, but not several", () => {
    const late = (id: string): Task => ({ id, title: id, description: "", assigneeId: "u1", dueDate: "2026-09-01", status: "overdue", priority: "high" }) as Task;
    expect(computeNextSteps({ ...base, tasks: [late("a")] })[0].to).toBe("/tasks?task=a");
    expect(computeNextSteps({ ...base, tasks: [late("a"), late("b")] })[0].to).toBe("/tasks");
  });
});

describe("data collection", () => {
  it("parses Arabic and English sample sizes", () => {
    expect(parseSampleSize("حوالي ٣٨٤ مشارك")).toBe(384);
    expect(parseSampleSize("n=120")).toBe(120);
    expect(parseSampleSize("لسا")).toBeNull();
  });
  const sv = (id: string, isPilot: boolean, targetN: number | null) => ({ id, title: id, status: "open", isPilot, targetN }) as never;
  it("ignores pilot responses and prefers survey targets", () => {
    const r = summarizeCollection([sv("a", false, 100), sv("p", true, 20)], { a: 40, p: 15 }, "384");
    expect(r).toMatchObject({ collected: 40, target: 100, targetSource: "surveys" });
  });
  it("falls back to the methodology sample size, then to no target", () => {
    expect(summarizeCollection([sv("a", false, null)], { a: 5 }, "384")).toMatchObject({ target: 384, targetSource: "methodology" });
    expect(summarizeCollection([sv("a", false, null)], { a: 5 }, "").target).toBeNull();
  });
  it("progress caps at 100 and is null without a target", () => {
    expect(getStageAutoProgress("data-collection", { dataCollection: { collected: 40, target: 100 } })).toBe(40);
    expect(getStageAutoProgress("data-collection", { dataCollection: { collected: 140, target: 100 } })).toBe(100);
    expect(getStageAutoProgress("data-collection", { dataCollection: { collected: 5, target: null } })).toBeNull();
  });
});

describe("supervisor digest", () => {
  const snap = (tasks: { title: string; status: "todo" | "in-progress" | "done" | "overdue" }[], sec: "not-started" | "in-progress" | "done") => ({
    teamName: "t",
    tasks,
    proposalSections: [{ key: "bg", labelAr: "خلفية", status: sec }],
  });
  it("reports what changed since the last visit", () => {
    const prev = buildSeen(snap([{ title: "A", status: "todo" }, { title: "B", status: "in-progress" }], "in-progress"), 2);
    const now = snap([{ title: "A", status: "done" }, { title: "B", status: "overdue" }, { title: "C", status: "todo" }], "done");
    const lines = diffSince(prev, now, 4);
    expect(lines).toEqual(expect.arrayContaining(["1 مهمة جديدة", "خلّصوا: «A»", "تأخّرت: «B»", "2 ردود جديدة من الفريق"]));
    expect(lines.some((l) => l.includes("خلفية"))).toBe(true);
  });
  it("is empty when nothing changed, and ignores messages until they are loaded", () => {
    const s = snap([{ title: "A", status: "todo" }], "not-started");
    expect(diffSince(buildSeen(s, 3), s, null)).toEqual([]);
  });
});
