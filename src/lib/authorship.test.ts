import { describe, expect, it } from "vitest";
import { authorshipDelta, sealPercent } from "./authorship";

describe("authorship seal", () => {
  it("counts only added characters", () => {
    expect(authorshipDelta("abc", "abcdef")).toBe(3);
    expect(authorshipDelta("abcdef", "abc")).toBe(0);
  });
  it("percent splits to 100 and is null when empty", () => {
    expect(sealPercent(82, 18)).toEqual({ human: 82, ai: 18 });
    expect(sealPercent(0, 0)).toBeNull();
  });
});
