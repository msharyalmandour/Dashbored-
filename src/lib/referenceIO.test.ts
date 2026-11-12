import { describe, expect, it } from "vitest";
import type { EvidencePaper } from "../data/types";
import { checkCitations, extractCitations, normalizeAuthors, parseBibtex, parseReferences, parseRis, sameStudy, toBibtex, toRis } from "./referenceIO";

const paper = (o: Partial<EvidencePaper> = {}): EvidencePaper => ({ id: "1", title: "Delirium in ICU", authors: "Devon HA, Zerwic J", year: 2010, theme: "Delirium" as EvidencePaper["theme"], studyDesign: "", keyFinding: "", relevance: "", section: "literature-review", reviewStatus: "collected", addedById: "u", link: "https://doi.org/10.1016/j.x.2010.1", ...o });

describe("normalizeAuthors", () => {
  it("يوحّد الصيغ", () => {
    expect(normalizeAuthors("Devon, Heather A. and Zerwic, J")).toBe("Devon HA, Zerwic J");
    expect(normalizeAuthors("Heather A Devon and Jane Zerwic")).toBe("Devon HA, Zerwic J");
  });
});

describe("parseBibtex", () => {
  it("يقرأ إدخالات Zotero بأقواس متداخلة", () => {
    const bib = `@article{devon2010,\n  title = {{Delirium} in the {ICU}: a review},\n  author = {Devon, Heather A. and Zerwic, Jane},\n  journal = {J Nurs},\n  year = {2010},\n  doi = {10.1016/j.x.2010.1}\n}\n@comment{ignore}\n@book{b, title="Second", year=2015, author="Galdas, P"}`;
    const r = parseBibtex(bib);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ title: "Delirium in the ICU: a review", authors: "Devon HA, Zerwic J", year: 2010, journal: "J Nurs", doi: "10.1016/j.x.2010.1" });
    expect(r[1]).toMatchObject({ title: "Second", year: 2015 });
  });
});

describe("parseRis", () => {
  it("يقرأ RIS", () => {
    const ris = "TY  - JOUR\nAU  - Devon, Heather A.\nAU  - Zerwic, Jane\nTI  - Delirium in ICU\nPY  - 2010///\nJO  - J Nurs\nDO  - 10.1016/x\nER  - \n";
    expect(parseRis(ris)[0]).toMatchObject({ title: "Delirium in ICU", authors: "Devon HA, Zerwic J", year: 2010, doi: "10.1016/x" });
    expect(parseReferences(ris)).toHaveLength(1);
  });
});

describe("export", () => {
  it("BibTeX وRIS يعيدون القراءة بنفس البيانات", () => {
    const back = parseBibtex(toBibtex([paper()]));
    expect(back[0]).toMatchObject({ title: "Delirium in ICU", year: 2010, authors: "Devon HA, Zerwic J" });
    expect(parseRis(toRis([paper()]))[0].title).toBe("Delirium in ICU");
  });
});

describe("sameStudy", () => {
  it("يكتشف التكرار بالعنوان أو بأول مؤلف + السنة", () => {
    expect(sameStudy({ title: "delirium in icu", authors: "", year: null, journal: "", doi: "", url: "" }, paper())).toBe(true);
    expect(sameStudy({ title: "Other", authors: "Devon H", year: 2010, journal: "", doi: "", url: "" }, paper())).toBe(true);
    expect(sameStudy({ title: "Other", authors: "Smith J", year: 2010, journal: "", doi: "", url: "" }, paper())).toBe(false);
  });
});

describe("citations", () => {
  const text = "Delay is common (Devon et al., 2010; Galdas & Smith, 2011). As Brown (2019) showed, and (Zerwic, 2010).";
  it("يستخرج أنماط APA", () => {
    expect(extractCitations(text).map((c) => `${c.surname}${c.year}`).sort()).toEqual(["brown2019", "devon2010", "galdas2011", "zerwic2010"]);
  });
  it("يفرز الناقص وغير المذكور", () => {
    const r = checkCitations([text], [paper(), paper({ id: "2", authors: "Lee K", year: 2020, title: "X" })]);
    expect(r.matched).toBe(1);
    expect(r.missing.map((c) => c.surname).sort()).toEqual(["brown", "galdas", "zerwic"]);
    expect(r.uncited.map((p) => p.id)).toEqual(["2"]);
  });
});
