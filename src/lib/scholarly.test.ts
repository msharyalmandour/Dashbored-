import { describe, expect, it } from "vitest";
import { enrichFromCrossref, mergeCandidates, parseCrossref, parseGoogleScholar, parseSemanticScholar, sameTitle } from "../../supabase/functions/research-agent/scholarly";

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

const scholar = {
  organic_results: [
    {
      title: "Role ambiguity and nursing interns' achievement of clinical rotation goals: a correlational study",
      link: "https://link.springer.com/article/10.1186/s12912-025-03842-y",
      snippet: "Nursing interns frequently encounter role ambiguity due to a mismatch …",
      publication_info: { summary: "MMA Abdelaziz, MSM Saleh, ZM Aysha - BMC Nursing, 2025 - Springer" },
      inline_links: { cited_by: { total: 7 } },
    },
    { title: "[CITATION][C] Some book", link: "", publication_info: { summary: "X - 2019" } },
    {
      title: "Clinical judgment among nursing interns",
      link: "https://www.sciedu.ca/journal/index.php/cns/article/view/12345",
      snippet: "Clinical judgment (CJ) is considered a vital …",
      publication_info: { summary: "AF Ibrahim, AA Aly - Clinical Nursing Studies, 2018 - sciedu.ca" },
    },
  ],
};

describe("parseGoogleScholar", () => {
  it("maps SerpApi rows, reads the DOI from the link and skips citation-only rows", () => {
    const list = parseGoogleScholar(scholar);
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ source: "googlescholar", year: 2025, journal: "BMC Nursing", doi: "10.1186/s12912-025-03842-y", citedBy: 7, url: "https://doi.org/10.1186/s12912-025-03842-y" });
    expect(list[1]).toMatchObject({ year: 2018, journal: "Clinical Nursing Studies", doi: null, citedBy: null });
  });
});

describe("sameTitle", () => {
  it("matches the same study despite punctuation and quotes", () => {
    expect(sameTitle("Role ambiguity and nursing interns’ achievement of clinical rotation goals: a correlational study", "Role ambiguity and nursing interns' achievement of clinical rotation goals - a correlational study")).toBe(true);
    expect(sameTitle("Clinical judgment among nursing interns", "Development of clinical judgment model to guide nursing interns")).toBe(false);
  });
});

describe("enrichFromCrossref", () => {
  it("fills the full abstract and DOI from Crossref only when the title matches", async () => {
    const list = parseGoogleScholar(scholar);
    const fetchFn = async (url: string) => {
      const isJudgment = decodeURIComponent(url).includes("Clinical judgment among nursing interns");
      const body = isJudgment
        ? { message: { items: [{ DOI: "10.5430/cns.v6n3p19", type: "journal-article", title: ["Clinical judgment among nursing interns"], abstract: "<jats:p>" + "Long abstract text. ".repeat(12) + "</jats:p>", "container-title": ["Clinical Nursing Studies"], issued: { "date-parts": [[2018]] } }] } }
        : { message: { items: [{ DOI: "10.9/other", type: "journal-article", title: ["Something unrelated entirely"], abstract: "<jats:p>x</jats:p>" }] } };
      return { ok: true, status: 200, text: async () => JSON.stringify(body) };
    };
    const [a, b] = await enrichFromCrossref(list, fetchFn);
    expect(a.doi).toBe("10.1186/s12912-025-03842-y");
    expect(a.abstract.startsWith("Nursing interns frequently")).toBe(true);
    expect(b.doi).toBe("10.5430/cns.v6n3p19");
    expect(b.url).toBe("https://doi.org/10.5430/cns.v6n3p19");
    expect(b.abstract.length).toBeGreaterThan(150);
  });
});
