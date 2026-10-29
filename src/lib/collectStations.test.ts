import { describe, expect, it } from "vitest";
import { computeStations, cumulativeByDay } from "./collectStations";

const base = { researchType: "quantitative" as const, hasInstrument: false, toolChecked: false, ethicsGranted: false, consentChecked: false, collected: 0, target: 100 as number | null };
const states = (x: Partial<typeof base>) => computeStations({ ...base, ...x }).map((s) => s.state);

describe("computeStations", () => {
  it("أول محطة ما خلصت هي الحالية", () => {
    expect(states({})).toEqual(["now", "next", "next", "next"]);
    expect(states({ hasInstrument: true })).toEqual(["done", "now", "next", "next"]);
    expect(states({ hasInstrument: true, ethicsGranted: true })).toEqual(["done", "done", "now", "next"]);
  });
  it("لو بدأت الردود، الميدان هو الحالي حتى لو الموافقة ما تعلّمت", () => {
    expect(states({ hasInstrument: true, collected: 5 })).toEqual(["done", "done", "now", "next"]);
  });
  it("بعد اكتمال العينة ينتقل للتحليل", () => {
    expect(states({ hasInstrument: true, ethicsGranted: true, collected: 100 })).toEqual(["done", "done", "done", "now"]);
  });
  it("بدون هدف، الميدان ما يخلص", () => {
    expect(states({ hasInstrument: true, ethicsGranted: true, collected: 50, target: null })[2]).toBe("now");
  });
});

describe("cumulativeByDay", () => {
  it("يجمع تراكميًا حسب اليوم", () => {
    expect(cumulativeByDay(["2026-10-01T10:00", "2026-10-01T11:00", "2026-10-03T09:00"])).toEqual([
      { day: "2026-10-01", total: 2 },
      { day: "2026-10-03", total: 3 },
    ]);
  });
});
