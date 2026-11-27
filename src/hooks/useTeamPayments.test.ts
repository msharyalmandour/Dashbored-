import { describe, expect, it } from "vitest";
import { coveredIds } from "./useTeamPayments";

const NOW = new Date("2026-11-27T12:00:00Z").getTime();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

describe("coveredIds", () => {
  it("covers each payer for their plan length", () => {
    const ids = coveredIds(
      [
        { profile_id: "a", period: "month", created_at: daysAgo(10) },
        { profile_id: "b", period: "month", created_at: daysAgo(40) }, // انتهت
        { profile_id: "c", period: "year", created_at: daysAgo(200) }, // السنة الدراسية لسا
        { profile_id: "d", created_at: daysAgo(5) }, // دفعة قديمة بدون مدة = شهري
      ],
      ["a", "b", "c", "d"],
      NOW,
    );
    expect([...ids].sort()).toEqual(["a", "c", "d"]);
  });
  it("a whole-team payment covers everyone", () => {
    const ids = coveredIds([{ profile_id: "a", for_team: true, period: "semester", created_at: daysAgo(100) }], ["a", "b", "c"], NOW);
    expect(ids.size).toBe(3);
  });
});
