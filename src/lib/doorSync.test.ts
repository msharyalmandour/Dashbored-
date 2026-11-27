import { describe, expect, it } from "vitest";
import { reconcile } from "./doorSync";
import type { DoorId } from "./doors";

describe("reconcile (team_doors)", () => {
  const open = new Set<DoorId>(["write", "methodology"]);
  it("unlocks open doors missing on the server, once", () => {
    const r = reconcile(open, [{ key: "write", unlockedAt: "x", seenAt: "y" }]);
    expect(r.toUnlock).toEqual(["methodology"]);
    expect(r.fresh).toEqual(["methodology"]);
  });
  it("a door already unlocked but never seen is still fresh", () => {
    const r = reconcile(open, [{ key: "write", unlockedAt: "x", seenAt: null }, { key: "methodology", unlockedAt: "x", seenAt: "y" }]);
    expect(r.toUnlock).toEqual([]);
    expect(r.fresh).toEqual(["write"]);
  });
});
