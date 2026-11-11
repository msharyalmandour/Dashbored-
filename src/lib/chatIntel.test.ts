import { describe, expect, it } from "vitest";
import { boldParts, focusUntil, guessKnower, orphanQuestions } from "./chatIntel";
import type { ChatMessage } from "../hooks/useTeamChat";

const now = Date.parse("2026-11-11T12:00:00Z");
const m = (id: string, author: string, body: string, hoursAgo: number, extra: Partial<ChatMessage> = {}): ChatMessage => ({ id, authorId: author, kind: "user", meta: null, body, replyTo: null, ref: null, createdAt: new Date(now - hoursAgo * 3600e3).toISOString(), editedAt: null, deletedAt: null, ...extra });

describe("chat intelligence", () => {
  it("finds a question nobody answered for 24h", () => {
    const list = [m("1", "a", "نستخدم MBI أو CBI للقياس؟", 26), m("2", "r", "رفعت المحضر، شوفوه", 21)];
    const o = orphanQuestions(list, now);
    expect(o.map((x) => x.message.id)).toEqual(["1"]);
    expect(o[0].hours).toBe(26);
  });
  it("skips answered, young, or dismissed questions", () => {
    expect(orphanQuestions([m("1", "a", "وش رأيكم؟", 30), m("2", "k", "تمام", 29.5)], now)).toEqual([]);
    expect(orphanQuestions([m("1", "a", "وش رأيكم؟", 30), m("2", "k", "ايه", 3, { replyTo: "1" })], now)).toEqual([]);
    expect(orphanQuestions([m("1", "a", "وش رأيكم؟", 5)], now)).toEqual([]);
    expect(orphanQuestions([m("1", "a", "وش رأيكم؟", 30)], now, new Set(["1"]))).toEqual([]);
  });
  it("guesses who knows from task and section owners", () => {
    const who = guessKnower("نستخدم MBI أو CBI للقياس؟", "a", [
      { text: "تعديل أداة القياس MBI", ownerId: "k" },
      { text: "كتابة الخلفية", ownerId: "r" },
    ]);
    expect(who).toBe("k");
    expect(guessKnower("وش رأيكم؟", "a", [{ text: "كتابة الخلفية", ownerId: "r" }])).toBeNull();
  });
  it("splits **bold** parts", () => {
    expect(boldParts("عليك: **كتابة قسم العينة** قبل ١٤ نوف.")).toEqual([
      { t: "عليك: ", b: false },
      { t: "كتابة قسم العينة", b: true },
      { t: " قبل ١٤ نوف.", b: false },
    ]);
  });
  it("focus until tomorrow is 8am next day", () => {
    const d = focusUntil("tomorrow", new Date(2026, 10, 11, 22, 30));
    expect([d.getDate(), d.getHours()]).toEqual([12, 8]);
  });
});
