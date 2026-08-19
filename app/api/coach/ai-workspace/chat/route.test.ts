import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { requireActiveTeamCoachOrOrgAdmin } from "@/lib/supabase/access-control";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import {
  getAiCoachProviderReadiness,
  scanAiCoachDraftForProvider,
  scanAiCoachPromptForProvider,
  streamAiCoachWorkspaceConversation
} from "@/lib/services/ai-coach";

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
  getAiCoachProviderReadiness: vi.fn(),
  scanAiCoachDraftForProvider: vi.fn(),
  scanAiCoachPromptForProvider: vi.fn(),
  streamAiCoachWorkspaceConversation: vi.fn()
}));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const adminClientMock = vi.mocked(createSupabaseAdminClient);
const accessMock = vi.mocked(requireActiveTeamCoachOrOrgAdmin);
const readinessMock = vi.mocked(getAiCoachProviderReadiness);
const draftSafetyMock = vi.mocked(scanAiCoachDraftForProvider);
const promptSafetyMock = vi.mocked(scanAiCoachPromptForProvider);
const streamMock = vi.mocked(streamAiCoachWorkspaceConversation);

function request(body: unknown) {
  return new Request("http://localhost/api/coach/ai-workspace/chat", {
    method: "POST",
    headers: {
      authorization: "Bearer live-session",
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

const draft = {
  id: "team_onboarding_brief",
  label: "Team Onboarding Brief",
  title: "New coach and participant brief for Tiny Tigers",
  body: "Team onboarding brief body.",
  sourceEvidence: ["visible team chat"],
  workflow: ["Preview", "Edit", "Approve", "Publish"],
  boundary: "Coach review required."
} as const;

const messages = [{
  id: "msg-user-1",
  role: "user",
  parts: [{ type: "text", text: "Shorten this for busy parents." }]
}] as const;

describe("/api/coach/ai-workspace/chat", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authMock.mockResolvedValue({ ok: true, user: { id: "user-coach", email: "coach@example.com" } });
    adminClientMock.mockReturnValue({ from: vi.fn() } as never);
    accessMock.mockResolvedValue({ ok: true, message: "Access allowed.", team: { id: "team-tigers", organization_id: "org-1" } });
    readinessMock.mockReturnValue({
      configured: true,
      delivery: "netlify_gateway",
      provider: "openai",
      model: "gpt-5.5",
      reason: "ready"
    });
    draftSafetyMock.mockReturnValue({ ok: true, message: "Draft is provider-safe." });
    promptSafetyMock.mockReturnValue({ ok: true, message: "Prompt is provider-safe." });
    streamMock.mockResolvedValue(new Response("ok", { status: 200 }));
  });

  it("requires verified access before opening the AI coach chat stream", async () => {
    const response = await POST(request({ teamId: "team-tigers", draft, messages }));

    expect(response.status).toBe(200);
    expect(accessMock).toHaveBeenCalledWith({
      db: expect.anything(),
      teamId: "team-tigers",
      userId: "user-coach",
      action: "chat with AI Coach Workspace"
    });
    expect(streamMock).toHaveBeenCalledWith({
      actorUserId: "user-coach",
      draft: expect.objectContaining({ id: "team_onboarding_brief" }),
      messages: expect.arrayContaining([expect.objectContaining({ role: "user" })])
    });
  });

  it("fails closed when the provider runtime is not configured", async () => {
    readinessMock.mockReturnValue({
      configured: false,
      delivery: "netlify_gateway",
      provider: "openai",
      model: "gpt-5.5",
      reason: "OPENAI_API_KEY is missing in this runtime."
    });

    const response = await POST(request({ teamId: "team-tigers", draft, messages }));
    const result = await response.json();

    expect(response.status).toBe(503);
    expect(result.ok).toBe(false);
    expect(streamMock).not.toHaveBeenCalled();
  });

  it("blocks unsafe prompts before the provider stream starts", async () => {
    promptSafetyMock.mockReturnValue({
      ok: false,
      message: "Prompt contains contact details and cannot be sent to an AI provider."
    });

    const response = await POST(request({ teamId: "team-tigers", draft, messages }));
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.ok).toBe(false);
    expect(streamMock).not.toHaveBeenCalled();
  });
});
