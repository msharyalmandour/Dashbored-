import { beforeEach, describe, expect, it } from "vitest";
import { captureSignupRef, parseRef, storedSignupRef } from "./signupSource";

// بيئة الاختبار node: نسوي localStorage بسيط
const mem = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage;

describe("parseRef", () => {
  it("treats supervisor as a source, not a team code", () => {
    expect(parseRef("supervisor")).toEqual({ source: "supervisor" });
    expect(parseRef("Supervisor")).toEqual({ source: "supervisor" });
  });
  it("uppercases team codes and rejects junk", () => {
    expect(parseRef("ab12cd")).toEqual({ code: "AB12CD" });
    expect(parseRef("<script>")).toEqual({});
    expect(parseRef("")).toEqual({});
  });
});

describe("captureSignupRef", () => {
  beforeEach(() => localStorage.clear());
  it("reads ref before the hash (landing link)", () => {
    captureSignupRef({ search: "?ref=supervisor", hash: "" });
    expect(storedSignupRef()).toBe("supervisor");
  });
  it("reads ref inside the hash (login link)", () => {
    captureSignupRef({ search: "", hash: "#/login?ref=AB12CD" });
    expect(storedSignupRef()).toBe("AB12CD");
  });
  it("expires after 30 days", () => {
    captureSignupRef({ search: "?ref=supervisor", hash: "" });
    expect(storedSignupRef(Date.now() + 31 * 864e5)).toBeNull();
  });
});

describe("captureSignupRef ?r= (achievement card)", () => {
  it("reads the short r param too", () => {
    const store: Record<string, string> = {};
    globalThis.localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => void (store[k] = v), removeItem: (k: string) => void delete store[k] } as unknown as Storage;
    captureSignupRef({ search: "?r=k7q2xd", hash: "" });
    expect(storedSignupRef()).toBe("k7q2xd");
  });
});
