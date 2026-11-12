import { describe, expect, it } from "vitest";
import ar from "../../content/page-help.ar.json";
import en from "../../content/page-help.en.json";
import { helpFor, type PageHelpEntry } from "./PageHelp";

describe("page help content", () => {
  it("has the same pages in Arabic and English, each with a name, a line and 3 symbols", () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
    for (const t of [ar, en] as Record<string, PageHelpEntry>[])
      for (const [k, v] of Object.entries(t)) {
        expect(v.name, k).toBeTruthy();
        expect(v.lead, k).toBeTruthy();
        expect(v.symbols, k).toHaveLength(3);
      }
  });
  it("never mentions green and uses western digits only", () => {
    const s = JSON.stringify(ar);
    expect(s).not.toMatch(/أخضر|[٠-٩]/);
  });
  it("finds the page by its longest matching path", () => {
    const t = ar as Record<string, PageHelpEntry>;
    expect(helpFor("/tasks", t)?.name).toBe("مهامي");
    expect(helpFor("/meeting-minutes/new", t)?.name).toBe(t["/meeting-minutes"].name);
    expect(helpFor("/nowhere", t)).toBeNull();
  });
});
