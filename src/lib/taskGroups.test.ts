import { describe, expect, it } from "vitest";
import { groupTasks } from "./taskGroups";

const t = (dueDate: string, status = "todo") => ({ dueDate, status });

describe("groupTasks", () => {
  it("يفرز متأخرة/أسبوع/لاحقًا/مكتملة بالترتيب وبالأقرب موعد", () => {
    const g = groupTasks([t("2026-11-20"), t("2026-10-01"), t("2026-10-30"), t("2026-10-01", "done"), t("2026-10-28")], "2026-10-28");
    expect(g.map((x) => x.key)).toEqual(["overdue", "week", "later", "done"]);
    expect(g[1].items.map((x) => x.dueDate)).toEqual(["2026-10-28", "2026-10-30"]);
  });
  it("يخفي المجموعات الفاضية", () => {
    expect(groupTasks([t("2026-12-01")], "2026-10-28").map((x) => x.key)).toEqual(["later"]);
  });
});
