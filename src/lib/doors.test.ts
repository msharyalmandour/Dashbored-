import { describe, expect, it } from "vitest";
import { EMPTY_SIGNALS, journeyStep, newlyOpened, nextDoor, openDoors, type DoorSignals } from "./doors";
import { journeyNext, pickStep } from "./nextCard";

const sig = (p: Partial<DoorSignals>): DoorSignals => ({ ...EMPTY_SIGNALS, ...p });

describe("openDoors", () => {
  it("a fresh team sees only the always-open doors", () => {
    expect([...openDoors(sig({}))]).toEqual([]);
    expect(nextDoor(openDoors(sig({})))).toBe("write");
  });
  it("the first study opens «write»", () => {
    const o = openDoors(sig({ papers: 1 }));
    expect(o.has("write")).toBe(true);
    expect(o.has("methodology")).toBe(false);
    expect(nextDoor(o)).toBe("methodology");
  });
  it("the first written section opens methodology, supervisor and calendar", () => {
    const o = openDoors(sig({ papers: 2, sectionsWritten: 1 }));
    expect(["write", "methodology", "supervisor", "calendar"].every((d) => o.has(d as never))).toBe(true);
    expect(nextDoor(o)).toBe("collect");
  });
  it("methodology at 4 of 7 opens data collection", () => {
    expect(openDoors(sig({ methodReady: 4 })).has("collect")).toBe(true);
    expect(openDoors(sig({ methodReady: 3 })).has("collect")).toBe(false);
  });
  it("a team that said «we're collecting» gets every door", () => {
    expect(nextDoor(openDoors(sig({ stage: "collecting" })))).toBeNull();
  });
});

describe("newlyOpened", () => {
  it("does not celebrate on the very first visit", () => {
    expect(newlyOpened(new Set(["write"]), null)).toEqual([]);
  });
  it("celebrates only doors not seen before", () => {
    expect(newlyOpened(new Set(["write", "methodology"]), ["write"])).toEqual(["methodology"]);
  });
});

describe("journey", () => {
  it("starts honestly at 2 of 10 (team + topic)", () => {
    const s = sig({});
    expect(journeyStep(s, openDoors(s))).toBe(2);
  });
  it("moves with real work", () => {
    const s = sig({ papers: 3, sectionsWritten: 1 });
    expect(journeyStep(s, openDoors(s))).toBe(5);
  });
  it("next step follows the doors: studies → first section → methodology", () => {
    expect(journeyNext(sig({})).to).toContain("/research-search");
    expect(journeyNext(sig({ papers: 3 })).to).toBe("/proposal");
    expect(journeyNext(sig({ papers: 3, sectionsWritten: 4 })).to).toBe("/methodology");
  });
  it("a late task of mine comes before the journey", () => {
    const urgent = { id: "my-late", title: "عندك مهمة متأخرة", why: "", to: "/tasks", cta: "افتحوا", tone: "urgent" as const };
    expect(pickStep(urgent, sig({}), undefined)?.to).toBe("/tasks");
    expect(pickStep(undefined, sig({}), undefined)?.to).toContain("/research-search");
  });
});
