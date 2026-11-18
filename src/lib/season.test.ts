import { describe, expect, it } from "vitest";
import { seasonOf, type AcademicEvent } from "./season";

const ev = (o: Partial<AcademicEvent>): AcademicEvent => ({ id: "1", kind: "exam", title: "x", startsOn: "2026-11-20", endsOn: null, ...o });
const at = (iso: string) => new Date(iso);

describe("seasonOf", () => {
  it("normal with no events", () => expect(seasonOf([], at("2026-11-18T10:00:00+03:00")).kind).toBe("normal"));
  it("exam week from 2 days before: fewer tasks + thinking", () => {
    const s = seasonOf([ev({ startsOn: "2026-11-20", endsOn: "2026-11-26" })], at("2026-11-18T10:00:00+03:00"));
    expect(s.kind).toBe("exam");
    expect(s.taskCap).toBe(1);
    expect(s.state).toBe("thinking");
  });
  it("deadline within 24h dims the office and wins", () => {
    const s = seasonOf([ev({ kind: "exam", startsOn: "2026-11-18" }), ev({ id: "2", kind: "deadline", title: "المقترح", startsOn: "2026-11-18" })], at("2026-11-18T09:00:00+03:00"));
    expect(s.kind).toBe("deadline");
    expect(s.dim).toBe(true);
    expect(s.outfit).toBe("deadline");
  });
  it("training = one night reminder", () => expect(seasonOf([ev({ kind: "training", startsOn: "2026-11-17", endsOn: "2026-11-30" })], at("2026-11-18T10:00:00+03:00")).nightOnly).toBe(true));
});
