import { describe, expect, it } from "vitest";
import { remainingLabel, statusLabel, timingLabel, wordDiff } from "./commitments";

describe("commitments", () => {
  it("diffs word by word: removed words in «before», added in «after»", () => {
    const d = wordDiff("يهدف هذا البحث إلى معرفة الاحتراق عند الممرضين في المستشفيات.", "يهدف هذا البحث إلى قياس مستوى الاحتراق الوظيفي لدى ممرضي العناية في المستشفيات.");
    expect(d.before.some((p) => p.kind === "del" && p.t.includes("معرفة"))).toBe(true);
    expect(d.after.some((p) => p.kind === "add" && p.t.includes("قياس"))).toBe(true);
    expect(d.before.map((p) => p.t).join("")).toContain("يهدف هذا البحث إلى");
    expect(d.before.every((p) => p.kind !== "add")).toBe(true);
    expect(d.after.every((p) => p.kind !== "del")).toBe(true);
  });
  it("trims long unchanged runs around the change", () => {
    const same = Array.from({ length: 60 }, (_, i) => `كلمة${i}`).join(" ");
    const d = wordDiff(`${same} قديم`, `${same} جديد`);
    expect(d.after[0].t.startsWith("… ")).toBe(true);
    expect(d.after.at(-1)).toEqual({ t: "جديد", kind: "add" });
  });
  it("labels timing against the end of the due day (Riyadh)", () => {
    expect(timingLabel("2026-11-10T21:00:00Z", "2026-11-11")).toBe("قبل الموعد بـ 24 ساعة");
    expect(timingLabel("2026-11-14T21:00:00Z", "2026-11-11")).toBe("بعد الموعد بـ 3 أيام");
    expect(timingLabel(null, "2026-11-11")).toBe("");
  });
  it("labels promises' remaining time", () => {
    const now = Date.parse("2026-11-11T09:00:00Z");
    expect(remainingLabel("2026-11-13T09:00:00Z", now)).toBe("متبقي يومين");
    expect(remainingLabel("2026-11-12T09:00:00Z", now)).toBe("بكرة");
    expect(remainingLabel("2026-11-01T09:00:00Z", now)).toBe("فات موعده");
  });
  it("status words for the supervisor and the team", () => {
    expect(statusLabel({ direction: "from_supervisor", status: "proposed", receipt_sent_at: null, receipt_ack_at: null }).text).toBe("ينتظر اعتماد");
    expect(statusLabel({ direction: "from_supervisor", status: "done", receipt_sent_at: "x", receipt_ack_at: null })).toEqual({ text: "خلص · وصلها الإيصال", tone: "gold" });
    expect(statusLabel({ direction: "from_supervisor", status: "done", receipt_sent_at: "x", receipt_ack_at: "y" }).text).toBe("خلص · تمام ✓");
  });
});
