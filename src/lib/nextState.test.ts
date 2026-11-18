import { describe, expect, it } from "vitest";
import { nextState, wesyFor } from "./nextState";

describe("nextState", () => {
  it("loading wins, then no topic = day one", () => {
    expect(nextState({ loading: true, topic: "", waitingDoc: 0, step: null })).toBe("loading");
    expect(nextState({ loading: false, topic: "  ", waitingDoc: 2, step: 3 })).toBe("first");
  });
  it("waiting on the doctor, done at 10, otherwise middle", () => {
    expect(nextState({ loading: false, topic: "x", waitingDoc: 1, step: 5 })).toBe("waiting");
    expect(nextState({ loading: false, topic: "x", waitingDoc: 1, step: 10 })).toBe("done");
    expect(nextState({ loading: false, topic: "x", waitingDoc: 0, step: 4 })).toBe("middle");
  });
  it("wesy never uses an infinite or off-brand state", () => {
    expect(wesyFor("waiting", "د. إسراء").line).toContain("د. إسراء");
    expect(wesyFor("done", "").state).toBe("success");
  });
});
