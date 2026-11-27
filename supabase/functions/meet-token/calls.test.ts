import { describe, expect, it } from "vitest";
import { callScript, dueMeetings, joinNames, phoneTargets, ringPush, saPhone, twiml } from "./calls";

describe("Wesy calls", () => {
  it("finds calendar meetings that start now (Riyadh time)", () => {
    const now = Date.parse("2026-11-27T13:00:00Z"); // 16:00 الرياض
    const ev = (t: string, type = "meeting", date = "2026-11-27") => ({ event_date: date, event_time: t, event_type: type });
    const due = dueMeetings([ev("15:58"), ev("16:02"), ev("16:03"), ev("15:57"), ev("16:00", "deadline"), ev("16:00", "meeting", "2026-11-28")], now);
    expect(due.map((e) => e.event_time)).toEqual(["15:58", "16:02"]);
  });

  it("normalizes Saudi mobile numbers only", () => {
    expect(saPhone("0551234567")).toBe("+966551234567");
    expect(saPhone("966551234567")).toBe("+966551234567");
    expect(saPhone("+966 55 123 4567")).toBe("+966551234567");
    expect(saPhone("00966551234567")).toBe("+966551234567");
    expect(saPhone("0112345678")).toBeNull();
    expect(saPhone("")).toBeNull();
  });

  it("phones only absent members who opted in and didn't decline", () => {
    const members = [
      { id: "a", name: "ريان الشهري" },
      { id: "b", name: "خالد" },
      { id: "c", name: "نورة" },
      { id: "d", name: "سارة" },
      { id: "e", name: "أحمد" },
      { id: "f", name: "ليان" },
    ];
    const L = (id: string, call_me = true, phone = "0551234567") => ({ profile_id: id, phone, call_me, linked_at: "2026-11-20T00:00:00Z" });
    const targets = phoneTargets(
      members,
      [L("a"), L("b"), L("c", false), L("d"), L("e"), L("f", true, "123")],
      new Set(["b"]),
      [{ profile_id: "d", answer: "cant" }, { profile_id: "a", answer: "later" }],
      new Set(["e"]),
    );
    expect(targets.map((t) => t.id)).toEqual(["a"]);
    expect(targets[0].phone).toBe("+966551234567");
  });

  it("speaks naturally and escapes the call markup", () => {
    expect(joinNames(["نورة العتيبي", "أحمد", "سارة"])).toBe("نورة، أحمد وسارة");
    const s = callScript("ريان الشهري", ["خالد", "سارة"]);
    expect(s.startsWith("هلا ريان،")).toBe(true);
    expect(s).toContain("وخالد وسارة ينتظرونك");
    expect(callScript("ريان", [])).not.toContain("ينتظرونك");
    expect(callScript("سارة", [], true)).toContain("افتحي التطبيق وادخلي");
    expect(twiml("https://x.co/a.mp3?t=1&b=2", "")).toContain("<Play>https://x.co/a.mp3?t=1&amp;b=2</Play>");
    expect(twiml(null, "هلا <ريان>")).toContain('<Say language="ar-XA">هلا &lt;ريان&gt;</Say>');
    expect(ringPush("مشاري").body).toBe("مشاري بدأ اجتماع الفريق — ادخلوا");
    expect(ringPush("سارة العتيبي", undefined, true).body).toBe("سارة بدأت اجتماع الفريق — ادخلوا");
    expect(ringPush("").body).toBe("الفريق بدأ الاجتماع — ادخلوا");
  });
});
