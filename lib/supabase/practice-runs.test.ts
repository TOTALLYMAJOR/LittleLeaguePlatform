import { describe, expect, it } from "vitest";
import { validatePracticeRunPlan } from "./practice-runs";

describe("practice-run plan validation", () => {
  it("requires a usable plan before a receipt can be created", () => {
    expect(validatePracticeRunPlan({
      title: "Throwing and teamwork",
      focusAreas: ["throwing", "teamwork"],
      blocks: [
        { title: "Warm-up", duration: "8 min", activity: "Movement game" },
        { title: "Skill station", duration: "18 min", activity: "Partner throwing" }
      ]
    }).ok).toBe(true);

    expect(validatePracticeRunPlan({
      title: "",
      focusAreas: [],
      blocks: []
    }).ok).toBe(false);
  });
});
