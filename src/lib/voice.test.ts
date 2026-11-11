import { describe, expect, it } from "vitest";
import { fmtDur, shrinkPeaks } from "./voice";

describe("voice", () => {
  it("shrinks peaks to a fixed bar count with a floor", () => {
    const p = shrinkPeaks([0, 0.9, 0.1, 0.5, 0.2, 0.05], 3);
    expect(p).toEqual([0.9, 0.5, 0.2]);
    expect(shrinkPeaks([], 4)).toEqual([0.15, 0.15, 0.15, 0.15]);
    expect(shrinkPeaks([0, 0], 2)).toEqual([0.12, 0.12]);
  });
  it("formats durations", () => {
    expect(fmtDur(42_000)).toBe("0:42");
    expect(fmtDur(300_000)).toBe("5:00");
  });
});
