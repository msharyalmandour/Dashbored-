import { describe, expect, it } from "vitest";
import { stageOf, wesyMood } from "./wesyMood";

const at = (iso: string) => new Date(iso);

describe("wesyMood", () => {
  it("morning outfit between 5 and 11", () => {
    expect(wesyMood({ now: at("2026-11-18T07:30:00") }).outfit).toBe("morning");
    expect(wesyMood({ now: at("2026-11-18T14:00:00") }).outfit).toBe("normal");
  });
  it("yawns after midnight with the line", () => {
    const m = wesyMood({ now: at("2026-11-18T02:00:00") });
    expect(m.state).toBe("yawn");
    expect(m.line).toBe("ناموا، أنا أكمل");
  });
  it("deadline within 24h wins over time of day", () => {
    const m = wesyMood({ now: at("2026-11-18T08:00:00"), deadlines: ["2026-11-18T20:00:00"] });
    expect(m).toMatchObject({ outfit: "deadline", state: "deadline" });
    expect(wesyMood({ now: at("2026-11-18T08:00:00"), deadlines: ["2026-11-20T20:00:00"] }).outfit).toBe("morning");
  });
  it("national day and graduation", () => {
    expect(wesyMood({ now: at("2026-09-23T15:00:00") }).outfit).toBe("national");
    expect(wesyMood({ submitted: true }).outfit).toBe("grad");
  });
  it("ramadan by umm al-qura", () => {
    expect(wesyMood({ now: at("2027-02-20T15:00:00") }).outfit).toBe("ramadan");
  });
  it("stage grows with progress", () => {
    expect([stageOf(10), stageOf(30), stageOf(69), stageOf(70)]).toEqual([0, 2, 2, 3]);
  });
});
