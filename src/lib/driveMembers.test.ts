import { describe, expect, it } from "vitest";
import { DEFAULT_FOLDERS, isLinked, missingSentence } from "./driveMembers";

describe("driveMembers", () => {
  it("counts connected and view_only as linked", () => {
    expect(isLinked("connected")).toBe(true);
    expect(isLinked("view_only")).toBe(true);
    expect(isLinked("invited")).toBe(false);
    expect(isLinked("missing_email")).toBe(false);
  });

  it("names who is missing and why", () => {
    const s = missingSentence([
      { name: "أحمد", status: "connected" },
      { name: "خالد", status: "invited" },
      { name: "ريان", status: "missing_email" },
    ]);
    expect(s).toContain("خالد ما فتح الدعوة");
    expect(s).toContain("ريان ناقص إيميله");
    expect(s).not.toContain("أحمد");
  });

  it("joins several names in one clause", () => {
    const s = missingSentence([
      { name: "خالد", status: "invited" },
      { name: "سارة", status: "invited" },
    ]);
    expect(s).toContain("خالد وسارة ما فتح الدعوة");
  });

  it("says all linked when nobody is missing", () => {
    expect(missingSentence([{ name: "أحمد", status: "connected" }])).toContain("كل الفريق مربوط");
  });

  it("has the 6 numbered folders in order", () => {
    expect(DEFAULT_FOLDERS.map((f) => f.name.slice(0, 2))).toEqual(["01", "02", "03", "04", "05", "06"]);
  });
});
