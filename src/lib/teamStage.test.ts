import { describe, expect, it } from "vitest";
import { activeStageFor, firstRouteFor, stagesDoneFor } from "./teamStage";

describe("«بدأتوا قبل؟» stage rules", () => {
  it("counts earlier journey steps as done with proof", () => {
    expect(stagesDoneFor("topic")).toEqual(["topic"]);
    expect(stagesDoneFor("proposal")).toEqual(["topic"]);
    expect(stagesDoneFor("ethics")).toContain("methodology");
    expect(stagesDoneFor("ethics")).not.toContain("data-collection");
    expect(stagesDoneFor("collecting")).toContain("proposal");
    expect(stagesDoneFor("fresh")).toEqual([]);
    expect(stagesDoneFor(null)).toEqual([]);
  });
  it("picks the stage they continue in", () => {
    expect(activeStageFor("topic")).toBe("proposal");
    expect(activeStageFor("collecting")).toBe("data-collection");
    expect(activeStageFor("fresh")).toBeNull();
  });
  it("picks the first screen", () => {
    expect(firstRouteFor("proposal")).toBe("/proposal");
    expect(firstRouteFor("ethics")).toBe("/ethical-approval");
    expect(firstRouteFor("collecting")).toBe("/collect");
    expect(firstRouteFor(null)).toBe("/");
  });
});
