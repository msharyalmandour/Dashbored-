import { describe, expect, it } from "vitest";
import type { EvidencePaper } from "../data/types";
import { authorCell, literatureRows, literatureTsv } from "./literatureTable";

const paper = (o: Partial<EvidencePaper> = {}): EvidencePaper => ({
  id: "1", title: "T", authors: "Devon HA, Zerwic JJ", year: 2010, theme: "Delirium" as EvidencePaper["theme"], studyDesign: "Mixed method", keyFinding: "Women delayed", relevance: "", section: "literature-review", reviewStatus: "collected", addedById: "u", country: "US", aim: "To identify factors", sample: "256 patients", dataCollection: "Interviews", ...o,
});

describe("literature table", () => {
  it("خلية المؤلف: أول مؤلف et al. مع السنة", () => {
    expect(authorCell("Devon HA, Zerwic JJ", 2010)).toBe("Devon HA et al. (2010)");
    expect(authorCell("Galdas P", 2010)).toBe("Galdas P (2010)");
    expect(authorCell("", 2011)).toBe("(2011)");
  });
  it("الأعمدة بنفس ترتيب النموذج", () => {
    expect(literatureRows([paper()])[0]).toEqual(["Devon HA et al. (2010)", "US", "To identify factors", "Mixed method", "256 patients", "Interviews", "Women delayed"]);
  });
  it("TSV بدون أسطر داخل الخلايا", () => {
    expect(literatureTsv([paper({ aim: "a\nb" })]).split("\n")).toHaveLength(2);
  });
});
