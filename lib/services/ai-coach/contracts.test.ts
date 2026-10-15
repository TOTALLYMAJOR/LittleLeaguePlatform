import { describe, expect, it } from "vitest";
import { parseAiCoachWorkspaceDraft } from "./contracts";

const validDraft = {
  id: "team_onboarding_brief",
  label: "Team Onboarding Brief",
  title: "Tiny Tigers brief",
  body: "Coach-reviewed family update.",
  sourceEvidence: ["Visible team chat"],
  workflow: ["Preview", "Edit", "Approve", "Publish"],
  boundary: "Nothing is sent or published automatically."
};

describe("parseAiCoachWorkspaceDraft", () => {
  it("keeps the bounded workspace contract reusable outside the route", () => {
    expect(parseAiCoachWorkspaceDraft(validDraft)).toEqual(validDraft);
  });

  it("rejects unknown tools and incomplete drafts", () => {
    expect(parseAiCoachWorkspaceDraft({ ...validDraft, id: "unknown_tool" })).toBeNull();
    expect(parseAiCoachWorkspaceDraft({ ...validDraft, body: null })).toBeNull();
  });

  it("filters evidence and workflow values while enforcing output limits", () => {
    const parsed = parseAiCoachWorkspaceDraft({
      ...validDraft,
      label: "l".repeat(140),
      title: "t".repeat(220),
      body: "b".repeat(6100),
      boundary: "x".repeat(520),
      sourceEvidence: [...Array.from({ length: 14 }, (_, index) => `source-${index}`), 42],
      workflow: ["Preview", "Execute", "Publish"]
    });

    expect(parsed).toMatchObject({ workflow: ["Preview", "Publish"] });
    expect(parsed?.label).toHaveLength(120);
    expect(parsed?.title).toHaveLength(200);
    expect(parsed?.body).toHaveLength(6000);
    expect(parsed?.boundary).toHaveLength(500);
    expect(parsed?.sourceEvidence).toHaveLength(12);
  });
});
