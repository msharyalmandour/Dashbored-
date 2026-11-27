import { describe, expect, it } from "vitest";
import { addLine, bySpeaker, draftFromMeeting, transcriptFile, transcriptForAi, wordCount, type TxLine } from "./meetTranscript";

const L = (id: string, who: string, text: string, at: number, role = "student"): TxLine => ({ id, who, name: who === "s" ? "د. إسراء" : who, role, text, at, mine: false });

describe("meetTranscript", () => {
  it("adds lines in time order without duplicates or empties", () => {
    let x: TxLine[] = [];
    x = addLine(x, L("1", "سارة", "  أهلًا   فيكم ", 2000));
    x = addLine(x, L("2", "خالد", "متأخر شوي", 1000));
    x = addLine(x, L("1", "سارة", "مكرر", 3000));
    x = addLine(x, L("3", "خالد", "   ", 4000));
    expect(x.map((l) => l.id)).toEqual(["2", "1"]);
    expect(x[1].text).toBe("أهلًا فيكم");
  });

  it("merges a speaker's consecutive lines and tags the supervisor", () => {
    const lines = [L("1", "s", "كم العينة؟", 0, "supervisor"), L("2", "s", "وصلتوا؟", 1000, "supervisor"), L("3", "خالد", "86", 2000)];
    expect(bySpeaker(lines)).toHaveLength(2);
    expect(transcriptForAi(lines)).toBe("د. إسراء (المشرف/ة): كم العينة؟ وصلتوا؟\nخالد: 86");
    expect(transcriptFile(lines, "اجتماع", 0)).toContain("[00:02] خالد: 86");
    expect(wordCount(lines)).toBe(4);
  });

  it("keeps the newest speech when the transcript is too long for Wesy", () => {
    const lines = Array.from({ length: 50 }, (_, i) => L(String(i), i % 2 ? "أ" : "ب", `كلام رقم ${i}`, i * 1000));
    const t = transcriptForAi(lines, 60);
    expect(t.endsWith("كلام رقم 49")).toBe(true);
    expect(t.includes("كلام رقم 0")).toBe(false);
  });

  it("turns Wesy's minutes into a draft with attendance from who joined", () => {
    let n = 0;
    const d = draftFromMeeting(
      {
        gist: "العينة 120 قبل نهاية الشهر",
        items: [
          { kind: "decision", title: "نضيف مستشفى ثالث", sub: "", assignee_id: null, due: null },
          { kind: "task", title: "ريان يعدّل الاستبيان", sub: "الخميس", assignee_id: "r1", due: "2026-12-03" },
        ],
      },
      {
        title: "اجتماع الفريق",
        startedAt: Date.parse("2026-11-27T10:00:00Z"),
        endedAt: Date.parse("2026-11-27T10:30:00Z"),
        roster: [{ id: "r1", name: "ريان" }, { id: "k1", name: "خالد" }],
        present: [{ identity: "r1", role: "student", name: "ريان" }, { identity: "sup-1", role: "supervisor", name: "د. إسراء" }],
        supervisorName: "الدكتورة",
      },
      () => `c${n++}`,
    );
    expect(d.source).toBe("video");
    expect(d.planned).toBe(30);
    expect(d.endedAt).toBe("2026-11-27T10:30:00.000Z");
    expect(d.attendance.filter((a) => a.joinedAt).map((a) => a.id)).toEqual(["r1", "supervisor"]);
    expect(d.attendance.find((a) => a.id === "supervisor")?.name).toBe("د. إسراء");
    expect(d.captures.map((c) => c.tag)).toEqual(["point", "decision", "task"]);
    expect(d.captures[2]).toMatchObject({ by: "r1", dueDate: "2026-12-03", text: "ريان يعدّل الاستبيان (الخميس)", auto: true });
  });

  it("adds to a running minutes draft instead of replacing it", () => {
    const existing = { title: "اجتماع الإشراف", room: "قاعة 3", planned: 45, agenda: [], current: 0, startedAt: "2026-11-27T09:55:00.000Z", attendance: [], captures: [{ id: "x", at: "2026-11-27T09:56:00.000Z", by: null, tag: "point" as const, text: "سطر قديم" }] };
    const d = draftFromMeeting({ gist: "", items: [{ kind: "question", title: "نسأل عن اللجنة", sub: "", assignee_id: null, due: null }] }, { title: "x", startedAt: 0, endedAt: 60000, roster: [], present: [], supervisorName: "الدكتورة", existing }, () => "n");
    expect(d.title).toBe("اجتماع الإشراف");
    expect(d.captures.map((c) => c.text)).toEqual(["سطر قديم", "نسأل عن اللجنة"]);
  });
});
