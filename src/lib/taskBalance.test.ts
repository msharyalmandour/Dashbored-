import { describe, expect, it } from "vitest";
import { evenPlan } from "./taskBalance";

const t = (id: string, assigneeId: string, dueDate = "2026-11-10", status = "todo") => ({ id, title: id, assigneeId, dueDate, status });
const today = "2026-10-29";

describe("evenPlan", () => {
  it("ينقل من الأكثر للأقل لين يتقاربون، ويبدأ بالأبعد موعدًا", () => {
    const open = [t("a1", "a", "2026-11-01"), t("a2", "a", "2026-11-20"), t("a3", "a", "2026-11-05"), t("a4", "a", "2026-11-03")];
    const moves = evenPlan(open, ["a", "b"], today);
    expect(moves.map((m) => [m.task.id, m.from, m.to])).toEqual([
      ["a2", "a", "b"],
      ["a3", "a", "b"],
    ]);
  });
  it("ما ينقل المتأخرة ولا قيد التنفيذ", () => {
    const open = [t("x", "a", "2026-10-20"), t("y", "a", "2026-11-02", "in-progress"), t("z", "a")];
    expect(evenPlan(open, ["a", "b"], today).map((m) => m.task.id)).toEqual(["z"]);
  });
  it("لو متقاربين ما فيه اقتراح", () => {
    expect(evenPlan([t("1", "a"), t("2", "b"), t("3", "a")], ["a", "b"], today)).toEqual([]);
  });
});
