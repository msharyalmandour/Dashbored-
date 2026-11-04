import { describe, expect, it } from "vitest";
import { buildPdf } from "./imagesToPdf";

const fakeJpeg = (n: number) => new Uint8Array(Array.from({ length: n }, (_, i) => (i * 7) % 256));

describe("buildPdf", () => {
  it("writes one page per image with a valid xref table", () => {
    const pdf = buildPdf([
      { bytes: fakeJpeg(300), width: 800, height: 1100 },
      { bytes: fakeJpeg(120), width: 1100, height: 800 },
    ]);
    const text = new TextDecoder("latin1").decode(pdf);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("/Count 2");
    expect(text).toContain("/MediaBox [0 0 600.00 825.00]");
    expect(text).toContain("/Filter /DCTDecode /Length 300");

    // كل مدخل بالـ xref لازم يأشّر على بداية «N 0 obj» بالضبط
    const startxref = Number(text.match(/startxref\n(\d+)/)![1]);
    expect(text.slice(startxref, startxref + 4)).toBe("xref");
    const entries = text.slice(startxref).split("\n").slice(3, 3 + 8);
    entries.forEach((line, i) => {
      const off = Number(line.slice(0, 10));
      expect(text.slice(off, off + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`);
    });
  });
});
