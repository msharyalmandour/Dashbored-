import { describe, expect, it } from "vitest";
import { computeContribution, riyadhDay, teamPulse, type ContribTask } from "./contribution";

const T = (assigneeId: string, over: Partial<ContribTask> = {}): ContribTask => ({
  assigneeId,
  status: "done",
  priority: "medium",
  dueDate: "2026-10-20",
  completedAt: "2026-10-19T10:00:00Z",
  ...over,
});

describe("computeContribution", () => {
  const today = "2026-10-24";

  it("يوزّع الحصص بالنقاط (عالية ٣، متوسطة ٢، منخفضة ١)", () => {
    const tasks = [T("a", { priority: "high" }), T("b", { priority: "medium" }), T("b", { priority: "low" })];
    const r = computeContribution(["a", "b"], tasks, today);
    expect(r.totalPoints).toBe(6);
    expect(r.rows.find((x) => x.memberId === "a")).toMatchObject({ points: 3, share: 50, done: 1 });
    expect(r.rows.find((x) => x.memberId === "b")).toMatchObject({ points: 3, share: 50, done: 2 });
  });

  it("الالتزام بالموعد: يقارن يوم الإكمال بتوقيت الرياض مع الموعد", () => {
    // 21:30 UTC يوم 20 = 00:30 الرياض يوم 21 → متأخر عن موعد 20
    expect(riyadhDay("2026-10-20T21:30:00Z")).toBe("2026-10-21");
    const tasks = [T("a"), T("a", { completedAt: "2026-10-20T21:30:00Z" }), T("a", { completedAt: null })];
    const a = computeContribution(["a"], tasks, today).rows[0];
    expect(a.onTimeRate).toBe(50); // مهمتان بتاريخ إكمال: وحدة بالموعد ووحدة متأخرة؛ الثالثة بدون تاريخ ما تُحسب
  });

  it("onTimeRate = null لو ما فيه تواريخ إكمال", () => {
    expect(computeContribution(["a"], [T("a", { completedAt: null })], today).rows[0].onTimeRate).toBeNull();
  });

  it("المتأخرة تُحسب من الموعد حتى لو الحالة ما تحدّثت", () => {
    const r = computeContribution(["a"], [T("a", { status: "todo", dueDate: "2026-10-01", completedAt: null })], today);
    expect(r.rows[0].overdue).toBe(1);
  });

  it("آخر ١٤ يوم فقط", () => {
    const tasks = [T("a", { completedAt: "2026-10-20T10:00:00Z" }), T("a", { completedAt: "2026-09-01T10:00:00Z" })];
    expect(computeContribution(["a"], tasks, today).rows[0].doneLast14).toBe(1);
  });

  it("ينبّه لو عضو واحد يحمل أكثر من نصف الإنجاز، وللأعضاء بدون إنجاز", () => {
    const tasks = [T("a", { priority: "high" }), T("a", { priority: "high" }), T("b", { priority: "low" })];
    const r = computeContribution(["a", "b", "c"], tasks, today);
    expect(r.dominantId).toBe("a");
    expect(r.idleIds).toEqual(["c"]);
  });

  it("ما ينبّه مع بيانات قليلة أو فريق أقل من ٣", () => {
    expect(computeContribution(["a", "b", "c"], [T("a")], today)).toMatchObject({ dominantId: null, idleIds: [] });
    expect(computeContribution(["a", "b"], [T("a", { priority: "high" }), T("a", { priority: "high" })], today).dominantId).toBeNull();
  });
});

describe("teamPulse", () => {
  it("أقرب موعد، أطول تأخير، وأعضاء بدون مهام", () => {
    const p = teamPulse(
      [
        { status: "todo", dueDate: "2026-10-28", assigneeName: "سارة" },
        { status: "todo", dueDate: "2026-10-30", assigneeName: "سارة" },
        { status: "overdue", dueDate: "2026-10-20", assigneeName: "نورة" },
        { status: "done", dueDate: "2026-09-01", assigneeName: "نورة" },
      ],
      ["سارة", "نورة", "ريم"],
      "2026-10-24",
    );
    expect(p.nextDue).toEqual({ date: "2026-10-28", daysLeft: 4 });
    expect(p.worstLateDays).toBe(4);
    expect(p.unassignedMembers).toEqual(["ريم"]);
  });
  it("بدون مهام مفتوحة", () => {
    expect(teamPulse([], [], "2026-10-24")).toEqual({ nextDue: null, worstLateDays: 0, unassignedMembers: [] });
  });
});
