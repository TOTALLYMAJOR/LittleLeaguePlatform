import { describe, expect, it, vi } from "vitest";
import type { AiCoachWorkspaceDraft } from "../../domain";
import {
  enhanceAiCoachWorkspaceDraft,
  getAiCoachProviderReadiness,
  scanAiCoachDraftForProvider
} from ".";

const baseDraft: AiCoachWorkspaceDraft = {
  id: "team_onboarding_brief",
  label: "Team Onboarding Brief",
  title: "New coach and participant brief for Tiny Tigers",
  body: "Team onboarding brief for Tiny Tigers\n\nWhat the group is discussing:\n- coach game day questions: Blue jersey and arrival reminders.\n\nImportant player context:\n- Mason T. (#7)",
  sourceEvidence: ["2 visible team chat message(s)", "5 roster player(s)", "guardian-link aggregate"],
  workflow: ["Preview", "Edit", "Approve", "Publish"],
  boundary: "Coach or admin must review before sharing; no provider send occurs."
};

describe("AI Coach provider", () => {
  it("stays disabled until the provider flag and API key are present", () => {
    expect(getAiCoachProviderReadiness({ apiKey: "key", enabled: false }).configured).toBe(false);
    expect(getAiCoachProviderReadiness({ enabled: true }).reason).toContain("OPENAI_API_KEY");
  });

  it("blocks contact and private details before a provider call", () => {
    expect(scanAiCoachDraftForProvider({ ...baseDraft, body: `${baseDraft.body}\nCall 555-123-4567.` }).ok).toBe(false);
    expect(scanAiCoachDraftForProvider({ ...baseDraft, body: `${baseDraft.body}\nPrivate RSVP note: running late.` }).ok).toBe(false);
  });

  it("calls the Responses API with store disabled and returns a coach-reviewed draft", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      output_text: JSON.stringify({
        title: "AI-refined Tiny Tigers onboarding brief",
        body: "Use this as a coach-reviewed onboarding brief. Blue jersey and arrival reminders are the only sourced discussion items.",
        reviewNotes: ["Used only supplied source evidence.", "Kept output review-only."]
      })
    }), { status: 200 }));

    const result = await enhanceAiCoachWorkspaceDraft(baseDraft, {
      apiKey: "test-key",
      enabled: true,
      model: "gpt-5.5",
      fetcher
    });

    expect(result.ok).toBe(true);
    expect(result.source).toBe("openai");
    expect(result.draft.title).toContain("AI-refined");
    expect(result.draft.boundary).toContain("coach-reviewed");

    const requestBody = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(requestBody.model).toBe("gpt-5.5");
    expect(requestBody.store).toBe(false);
    expect(requestBody.input).toContain("guardian-link aggregate");
  });
});
