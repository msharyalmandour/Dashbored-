import { describe, expect, it } from "vitest";
import { avatarLetter } from "./avatarLetter";

describe("avatarLetter", () => {
  it("takes two letters when the name starts with an alef", () => {
    expect(avatarLetter("د. إسراء")).toBe("إس");
    expect(avatarLetter("احمد الغبيشي")).toBe("اح");
  });
  it("takes one letter otherwise", () => {
    expect(avatarLetter("ريان الشهري")).toBe("ر");
    expect(avatarLetter("mshary")).toBe("M");
    expect(avatarLetter("Dr. Sara")).toBe("S");
  });
  it("falls back when empty", () => {
    expect(avatarLetter("")).toBe("؟");
    expect(avatarLetter(null, "د")).toBe("د");
  });
});
