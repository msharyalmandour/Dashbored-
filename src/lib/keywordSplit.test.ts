import { describe, expect, it } from "vitest";
import { searchStringFor, splitKeywords, taskTextFor } from "./keywordSplit";

describe("splitKeywords", () => {
  it("يوزّع بالتساوي ويتجاهل التكرار", () => {
    const g = splitKeywords(["delirium", "nurses", "Delirium", "knowledge", "CAM-ICU"], ["a", "b"]);
    expect(g).toEqual([
      { memberId: "a", terms: ["delirium", "knowledge"] },
      { memberId: "b", terms: ["nurses", "CAM-ICU"] },
    ]);
  });
  it("عدد كلمات أقل من الأعضاء: ما يطلع عضو فاضي", () => {
    expect(splitKeywords(["x"], ["a", "b", "c"])).toHaveLength(1);
    expect(splitKeywords(["x"], [])).toEqual([]);
  });
});

describe("searchStringFor / taskTextFor", () => {
  it("يلف العبارات بعلامات اقتباس", () => {
    expect(searchStringFor(["delirium", "early detection"])).toBe('(delirium OR "early detection")');
  });
  it("عنوان المهمة مختصر ووصفها فيه الجملة", () => {
    const t = taskTextFor(["a", "b", "c", "d"], ["PubMed"], 5);
    expect(t.title).toContain("…");
    expect(t.description).toContain('(a OR b OR c OR d)');
  });
});
