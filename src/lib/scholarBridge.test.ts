import { describe, expect, it } from "vitest";
import { crossrefToPaper, extractDois, extractTitleLines, scholarUrl, searchLogSummary } from "./scholarBridge";

describe("scholarUrl", () => {
  it("يبني رابط بحث مشفّر مع سنة اختيارية", () => {
    const u = scholarUrl('(delirium OR "early detection") AND nurses', 2015);
    expect(u.startsWith("https://scholar.google.com/scholar?")).toBe(true);
    expect(new URL(u).searchParams.get("q")).toBe('(delirium OR "early detection") AND nurses');
    expect(new URL(u).searchParams.get("as_ylo")).toBe("2015");
  });
});

describe("extractDois", () => {
  it("يلقط DOI من روابط ونصوص ويشيل التكرار وعلامات الختام", () => {
    const t = "see https://doi.org/10.1016/j.ijnurstu.2019.103456. and (10.1111/jocn.12345) again 10.1016/J.IJNURSTU.2019.103456";
    expect(extractDois(t)).toEqual(["10.1016/j.ijnurstu.2019.103456", "10.1111/jocn.12345"]);
  });
});

describe("extractTitleLines", () => {
  it("يتجاهل الأسطر القصيرة والتي فيها DOI", () => {
    const t = "1. Knowledge and practice of nurses toward early delirium detection\nshort\n10.1111/jocn.12345 some long line that has doi inside of it here";
    expect(extractTitleLines(t)).toEqual(["Knowledge and practice of nurses toward early delirium detection"]);
  });
});

describe("crossrefToPaper", () => {
  it("يحوّل رد Crossref لمدخل دراسة", () => {
    const p = crossrefToPaper({ title: ["<i>Delirium</i> in ICU"], author: [{ given: "Hanan A", family: "Devon" }, { given: "J", family: "Zerwic" }], issued: { "date-parts": [[2010, 5]] }, "container-title": ["J Nurs"], DOI: "10.1/AbC" });
    expect(p).toMatchObject({ title: "Delirium in ICU", authors: "Devon HA, Zerwic J", year: 2010, journal: "J Nurs", doi: "10.1/abc", link: "https://doi.org/10.1/abc" });
  });
  it("بدون عنوان = null", () => {
    expect(crossrefToPaper({})).toBeNull();
  });
});

describe("searchLogSummary", () => {
  it("يجمّع حسب القاعدة", () => {
    const s = searchLogSummary([
      { database: "Google Scholar", query: "a", results: 100, selected: 3, by: "u", at: "" },
      { database: "Google Scholar", query: "b", results: 40, selected: 2, by: "u", at: "" },
      { database: "PubMed", query: "c", results: null, selected: null, by: "u", at: "" },
    ]);
    expect(s).toEqual([{ database: "Google Scholar", searches: 2, selected: 5 }, { database: "PubMed", searches: 1, selected: 0 }]);
  });
});
