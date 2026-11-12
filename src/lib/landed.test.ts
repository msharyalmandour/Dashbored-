import { describe, expect, it } from "vitest";
import { sectionOf } from "./landed";
import { deepLink } from "./drops";

describe("hero landed → sidebar section", () => {
  it("maps each destination's deep link to its sidebar section", () => {
    const at = (destination: string, payload: Record<string, unknown> = {}) => sectionOf(deepLink({ destination, payload, created_entities: [] } as never));
    expect(at("library")).toBe("search");
    expect(at("tasks")).toBe("tasks");
    expect(at("supervisor_note")).toBe("supervisor");
    expect(at("minutes")).toBe("supervisor");
    expect(at("calendar")).toBe("calendar");
    expect(at("files")).toBe("calendar");
    expect(at("proposal", { section: "background" })).toBe("write");
    expect(at("dataset")).toBe("collect");
  });
  it("returns null for unknown routes", () => {
    expect(sectionOf("/nowhere")).toBeNull();
  });
});
