import { describe, expect, it } from "vitest";
import { dayBucket, studNotifs } from "./studNotifs";

const m = (o: Partial<Parameters<typeof studNotifs>[0][number]>) => ({ id: "x", sender: "supervisor" as const, body: "هلا", createdAt: "2026-11-18T08:00:00Z", readAt: null, kind: "text", payload: {}, ...o });

describe("studNotifs", () => {
  it("only doctor messages, newest first, typed by kind", () => {
    const out = studNotifs([m({ id: "a", createdAt: "2026-11-17T08:00:00Z", kind: "meeting", payload: { time: "12:00" } }), m({ id: "b", sender: "team" }), m({ id: "c" })], "د. إسراء");
    expect(out.map((n) => n.id)).toEqual(["c", "a"]);
    expect(out[1].kind).toBe("meeting");
    expect(out[1].title).toContain("د. إسراء");
    expect(out[0].kind).toBe("message");
    expect(out[0].unread).toBe(true);
  });
  it("request names the assignee", () => {
    const [n] = studNotifs([m({ kind: "request", payload: { assignee_name: "خالد", title: "عدّلوا البند" } })], "د. إسراء");
    expect(n.title).toContain("خالد");
  });
});

describe("dayBucket", () => {
  const now = new Date(2026, 10, 18, 15, 0);
  it("splits today / yesterday / older", () => {
    expect(dayBucket(new Date(2026, 10, 18, 9).toISOString(), now)).toBe("today");
    expect(dayBucket(new Date(2026, 10, 17, 22).toISOString(), now)).toBe("yesterday");
    expect(dayBucket(new Date(2026, 10, 15).toISOString(), now)).toBe("older");
  });
});
