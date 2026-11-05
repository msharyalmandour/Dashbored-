import { describe, expect, it } from "vitest";
import { defaultCharacter, parseCharacter, serializeCharacter } from "./avatarCharacter";

describe("avatarCharacter", () => {
  it("gives the same default for the same name", () => {
    expect(defaultCharacter("ريان الشهري")).toEqual(defaultCharacter("ريان الشهري"));
  });
  it("round-trips a saved choice", () => {
    const c = { piece: "shemagh" as const, bg: 2, skin: 1 };
    expect(parseCharacter(serializeCharacter(c), "x")).toEqual(c);
  });
  it("falls back to the name default on bad values", () => {
    expect(parseCharacter("hat:9:9", "خالد")).toEqual(defaultCharacter("خالد"));
    expect(parseCharacter("cap:9:-1", "خالد")).toEqual({ piece: "cap", bg: 0, skin: 0 });
  });
});
