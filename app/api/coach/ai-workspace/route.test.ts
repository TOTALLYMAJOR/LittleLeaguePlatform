import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { requireActiveTeamCoachOrOrgAdmin } from "@/lib/supabase/access-control";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { enhanceAiCoachWorkspaceDraft } from "@/lib/services/ai-coach";
import type { AiCoachWorkspaceDraft } from "@/lib/domain";
import { recordAiCoachGenerationEvidence } from "@/lib/supabase/ai-generation-evidence";

vi.mock("@/lib/supabase/route-auth", () => ({
  requireAuthenticatedRouteUser: vi.fn()
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn()
}));

vi.mock("@/lib/supabase/access-control", () => ({
  requireActiveTeamCoachOrOrgAdmin: vi.fn()
}));

vi.mock("@/lib/services/ai-coach", () => ({
  enhanceAiCoachWorkspaceDraft: vi.fn()
}));

vi.mock("@/lib/supabase/ai-generation-evidence", () => ({
  recordAiCoachGenerationEvidence: vi.fn()
}));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const adminClientMock = vi.mocked(createSupabaseAdminClient);
const accessMock = vi.mocked(requireActiveTeamCoachOrOrgAdmin);
const enhanceMock = vi.mocked(enhanceAiCoachWorkspaceDraft);
const evidenceMock = vi.mocked(recordAiCoachGenerationEvidence);

function request(body: unknown) {
  return new Request("http://localhost/api/coach/ai-workspace", {
    method: "POST",
    headers: {
      authorization: "Bearer live-session",
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

const draft: AiCoachWorkspaceDraft = {
  id: "team_onboarding_brief",
  label: "Team Onboarding Brief",
  title: "New coach and participant brief for Tiny Tigers",
  body: "Team onboarding brief body.",
  sourceEvidence: ["visible team chat"],
  workflow: ["Preview", "Edit", "Approve", "Publish"],
  boundary: "Coach review required."
};

describe("/api/coach/ai-workspace", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authMock.mockResolvedValue({ ok: true, user: { id: "user-coach", email: "coach@example.com" } });
    adminClientMock.mockReturnValue({ from: vi.fn() } as never);
    accessMock.mockResolvedValue({ ok: true, message: "Access allowed.", team: { id: "team-tigers", organization_id: "org-1" } });
    evidenceMock.mockResolvedValue({
      ok: true,
      message: "AI source manifest and review evidence recorded.",
      generationRun: { id: "run-1", created_at: "2026-07-19T10:00:00.000Z", review_status: "draft" }
    });
    enhanceMock.mockResolvedValue({
      ok: true,
      message: "AI provider draft created for coach review. Nothing was published or sent.",
      provider: "openai",
      model: "gpt-5.5",
      source: "openai",
      draft,
      reviewNotes: ["review-only"],
      trust: {
        includedSources: ["visible team chat"],
        excludedSources: ["Private parent notes"],
        generatedAt: "2026-07-19T10:00:00.000Z",
        model: "gpt-5.5",
        humanReviewRequired: true
      }
    });
  });

  it("requires a verified session and team staff access before provider drafting", async () => {
    const response = await POST(request({ teamId: "team-tigers", draft }));

    expect(response.status).toBe(200);
    expect(accessMock).toHaveBeenCalledWith({
      db: expect.anything(),
      teamId: "team-tigers",
      userId: "user-coach",
      action: "draft AI Coach Workspace provider copy"
    });
    expect(enhanceMock).toHaveBeenCalledWith(expect.objectContaining({ id: "team_onboarding_brief" }));
    expect(evidenceMock).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      teamId: "team-tigers",
      actorUserId: "user-coach"
    }));
  });

  it("blocks unauthorized team access without calling the provider", async () => {
    accessMock.mockResolvedValue({ ok: false, message: "Only assigned coaches or org admins can draft AI Coach Workspace provider copy." });

    const response = await POST(request({ teamId: "team-tigers", draft }));

    expect(response.status).toBe(403);
    expect(enhanceMock).not.toHaveBeenCalled();
  });
});
