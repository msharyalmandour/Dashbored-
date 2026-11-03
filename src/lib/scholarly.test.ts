import { describe, expect, it } from "vitest";
import { mergeCandidates, parseCrossref, parseSemanticScholar } from "../../supabase/functions/research-agent/scholarly";

const crossref = {
  message: {
    items: [
      {
        DOI: "10.1186/s12912-025-03842-y",
        URL: "https://doi.org/10.1186/s12912-025-03842-y",
        type: "journal-article",
        title: ["Role ambiguity and nursing interns’ achievement of clinical rotation goals: a correlational study"],
        author: [{ given: "Manal Mohammed Ahmed", family: "Abdelaziz" }, { given: "Zeinab Mohammed", family: "Aysha" }],
        issued: { "date-parts": [[2025, 9, 10]] },
        abstract:
          "<jats:title>Abstract</jats:title>\n <jats:sec>\n <jats:title>Background</jats:title>\n <jats:p>Nursing interns frequently encounter role ambiguity.</jats:p>\n </jats:sec>\n <jats:sec><jats:title>Methods</jats:title><jats:p>All nursing interns (<jats:italic>n</jats:italic> = 900) &lt; done.</jats:p></jats:sec>",
        "container-title": ["BMC Nursing"],
        "is-referenced-by-count": 7,
      },
      { title: [""], type: "journal-article" },
    ],
  },
};

describe("parseCrossref", () => {
  it("maps a Crossref work and cleans the JATS abstract", () => {
    const [c, ...rest] = parseCrossref(crossref);
    expect(rest).toHaveLength(0);
    expect(c.source).toBe("crossref");
    expect(c.year).toBe(2025);
    expect(c.journal).toBe("BMC Nursing");
    expect(c.authors).toBe("Manal Mohammed Ahmed Abdelaziz, Zeinab Mohammed Aysha");
    expect(c.url).toBe("https://doi.org/10.1186/s12912-025-03842-y");
    expect(c.citedBy).toBe(7);
    expect(c.isJournal).toBe(true);
    expect(c.abstract.startsWith("Background: Nursing interns frequently encounter role ambiguity.")).toBe(true);
    expect(c.abstract).toContain("Methods: All nursing interns (n = 900) < done.");
    expect(c.abstract).not.toContain("jats");
  });
});

describe("parseSemanticScholar", () => {
  it("maps a paper with DOI and PubMed id", () => {
    const [c] = parseSemanticScholar({
      data: [{ title: "Delirium knowledge among ICU nurses", abstract: "We surveyed 200 nurses.", year: 2021, journal: { name: "Nurse Educ Pract" }, authors: [{ name: "A. Nurse" }], externalIds: { DOI: "10.1/x", PubMed: "123" }, citationCount: 4, publicationTypes: ["JournalArticle"], url: "https://www.semanticscholar.org/paper/abc" }],
    });
    expect(c).toMatchObject({ source: "semanticscholar", year: 2021, journal: "Nurse Educ Pract", doi: "10.1/x", pmid: "123", url: "https://doi.org/10.1/x", isJournal: true, citedBy: 4 });
  });
});

describe("mergeCandidates with Crossref", () => {
  it("dedupes the same study found in two sources by DOI", () => {
    const [c] = parseCrossref(crossref);
    const same = { ...c, source: "openalex" as const, abstract: "" };
    const merged = mergeCandidates([[same], [c]], 10);
    expect(merged).toHaveLength(1);
    expect(merged[0].abstract.length).toBeGreaterThan(20);
  });
});
