import { describe, expect, it } from "vitest";
import { isReminderTitle, nextReminder, splitReminders } from "./taskReminders";
import { groupByDue } from "./taskGroups";

const t = (id: string, title: string, dueDate = "2026-10-31", status = "todo") => ({ id, title, dueDate, status });

describe("splitReminders", () => {
  it("يخفي «تذكير: إنجاز …» ويربطه بالمهمة الأصلية بدون ما يحذف شي", () => {
    const tasks = [
      t("a", "صياغة مشكلة البحث والفجوة المعرفية"),
      t("b", "كتابة خلفية البحث"),
      t("r1", "تذكير: إنجاز صياغة مشكلة البحث والفجوة المعرفية", "2026-10-29"),
      t("r2", "تذكير: إنجاز كتابة خلفية البحث", "2026-10-29"),
    ];
    const s = splitReminders(tasks);
    expect(s.visible.map((x) => x.id)).toEqual(["a", "b"]);
    expect(s.byTask.get("a")?.map((x) => x.id)).toEqual(["r1"]);
    expect(s.byTask.get("b")?.map((x) => x.id)).toEqual(["r2"]);
    expect(tasks).toHaveLength(4);
  });
  it("التذكير اللي ما له مهمة أصلية يبقى ظاهر", () => {
    const s = splitReminders([t("a", "مهمة ثانية"), t("r", "تذكير: شي ما له علاقة")]);
    expect(s.visible.map((x) => x.id)).toEqual(["a", "r"]);
  });
  it("يعرف العنوان الإنجليزي", () => {
    expect(isReminderTitle("Reminder: write background")).toBe(true);
    expect(isReminderTitle("كتابة تذكير")).toBe(false);
  });
  it("الشارة تاخذ أقرب تذكير جاي وتتجاهل اللي خلص أو فات", () => {
    const r = [t("1", "تذكير: x", "2026-10-27"), t("2", "تذكير: x", "2026-10-30"), t("3", "تذكير: x", "2026-10-29", "done")];
    expect(nextReminder(r, "2026-10-28")?.id).toBe("2");
  });
});

describe("groupByDue", () => {
  it("متأخرة ← اليوم وبكرة ← هالأسبوع ← لاحقًا ← خلصت", () => {
    const g = groupByDue(
      [t("1", "", "2026-11-20"), t("2", "", "2026-10-01"), t("3", "", "2026-10-29"), t("4", "", "2026-11-02"), t("5", "", "2026-10-01", "done"), t("6", "", "2026-11-01", "overdue")],
      "2026-10-28",
    );
    expect(g.map((x) => x.key)).toEqual(["overdue", "soon", "week", "later", "done"]);
    expect(g[0].items.map((x) => x.id)).toEqual(["2", "6"]);
    expect(g[1].items.map((x) => x.id)).toEqual(["3"]);
  });
});
