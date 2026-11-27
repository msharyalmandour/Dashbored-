import { describe, expect, it } from "vitest";
import { looksTeamOnly, parseThread } from "./docThread";

describe("looksTeamOnly (ChatGuard)", () => {
  it("flags laughing, teasing emoji and slang aimed at teammates", () => {
    expect(looksTeamOnly("هههههه طيب")).toBe(true);
    expect(looksTeamOnly("يا شباب مين يكلم المستشفى؟ 😂")).toBe(true);
    expect(looksTeamOnly("الدكتورة نست تعطينا الملاحظات")).toBe(true);
  });
  it("lets normal questions to the doctor through", () => {
    expect(looksTeamOnly("د. نقدر نرسل العينة الأحد بدل الخميس؟ 🙏")).toBe(false);
    expect(looksTeamOnly("أرسلنا النسخة المعدلة من الأداة")).toBe(false);
    expect(looksTeamOnly("")).toBe(false);
  });
});

describe("parseThread", () => {
  it("defaults kind to text before the SQL file runs", () => {
    const [m] = parseThread([{ id: "1", sender: "supervisor", senderName: "إسراء", body: "هلا", createdAt: "2026-11-18T10:00:00Z" }]);
    expect(m.kind).toBe("text");
    expect(m.reads).toBeNull();
    expect(m.rsvps).toEqual({});
  });
  it("keeps reads, members and rsvps", () => {
    const [m] = parseThread([{ id: "2", sender: "supervisor", body: "x", createdAt: "", kind: "meeting", payload: { date: "2026-11-23" }, reads: 3, members: 4, rsvps: { a: "yes" } }]);
    expect(m.kind).toBe("meeting");
    expect(m.reads).toBe(3);
    expect(m.members).toBe(4);
    expect(m.rsvps.a).toBe("yes");
  });
});
