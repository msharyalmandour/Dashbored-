import { describe, expect, it } from "vitest";
import { latinDigits } from "./liveStt";

describe("latinDigits", () => {
  it("turns Arabic-Indic and Persian digits into Western digits", () => {
    expect(latinDigits("العينة ١٢٠ ممرض من ٣ مستشفيات")).toBe("العينة 120 ممرض من 3 مستشفيات");
    expect(latinDigits("۱۴ نوفمبر")).toBe("14 نوفمبر");
    expect(latinDigits("no digits")).toBe("no digits");
  });
});
