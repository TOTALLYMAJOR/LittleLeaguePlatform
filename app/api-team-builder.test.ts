import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postInput } from "./api/admin/team-builder-inputs/route";
import { POST as postPlan } from "./api/admin/team-builder-plans/route";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { saveTeamBuilderInput } from "@/lib/supabase/team-builder-inputs";
import {
  approveTeamBuildPlan,
  publishTeamBuildPlan,
  saveTeamBuildPlan
} from "@/lib/supabase/team-builder-plans";

vi.mock("@/lib/supabase/route-auth", () => ({ requireAuthenticatedRouteUser: vi.fn() }));
vi.mock("@/lib/supabase/team-builder-inputs", () => ({
  readTeamBuilderInputs: vi.fn(),
  saveTeamBuilderInput: vi.fn()
}));
vi.mock("@/lib/supabase/team-builder-plans", () => ({
  approveTeamBuildPlan: vi.fn(),
  listTeamBuilderWorkbenchData: vi.fn(),
  publishTeamBuildPlan: vi.fn(),
  saveTeamBuildPlan: vi.fn()
}));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const saveInputMock = vi.mocked(saveTeamBuilderInput);
const approveMock = vi.mocked(approveTeamBuildPlan);
const publishMock = vi.mocked(publishTeamBuildPlan);

describe("team-builder admin APIs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("derives the private-input reviewer from the verified session", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "verified-admin" } });
    saveInputMock.mockResolvedValue({ ok: true, message: "Saved." });
    const response = await postInput(new Request("http://localhost/api/admin/team-builder-inputs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: "org-1",
        seasonId: "season-1",
        playerId: "player-1",
        ageBand: "8U",
        evaluationRating: 4,
        actorUserId: "forged-user",
        updatedByUserId: "forged-user"
      })
    }));
    expect(response.status).toBe(200);
    expect(saveInputMock).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: "verified-admin"
    }));
    expect(saveInputMock).not.toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: "forged-user"
    }));
  });

  it("derives approver identity and preserves expected-version input", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "verified-admin" } });
    approveMock.mockResolvedValue({
      ok: true,
      message: "Approved.",
      plan: { id: "plan-1", status: "approved", lockVersion: 3 },
      idempotent: false,
      providerExecution: "not_started"
    });
    const actionId = "46ad08ac-1431-4d7a-a783-254c9f3b7fbd";
    const response = await postPlan(new Request("http://localhost/api/admin/team-builder-plans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "approve",
        actionId,
        planId: "plan-1",
        expectedLockVersion: 2,
        actorUserId: "forged-user",
        approvedByUserId: "forged-user"
      })
    }));
    expect(response.status).toBe(200);
    expect(approveMock).toHaveBeenCalledWith({
      planId: "plan-1",
      actorUserId: "verified-admin",
      expectedLockVersion: 2,
      actionId
    });
  });

  it("maps stale publish to a conflict and does not call another lifecycle mutation", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "verified-admin" } });
    publishMock.mockResolvedValue({
      ok: false,
      conflict: true,
      message: "Refresh before retrying."
    });
    const response = await postPlan(new Request("http://localhost/api/admin/team-builder-plans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "publish",
        actionId: "46ad08ac-1431-4d7a-a783-254c9f3b7fbd",
        planId: "plan-1",
        expectedLockVersion: 2
      })
    }));
    expect(response.status).toBe(409);
    expect(saveTeamBuildPlan).not.toHaveBeenCalled();
  });
});
