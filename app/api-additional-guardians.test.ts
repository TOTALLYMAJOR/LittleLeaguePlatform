import { describe, expect, it, vi } from "vitest";
import { POST as requestGuardian } from "./api/parent/additional-guardians/route";
import { POST as reviewGuardian } from "./api/admin/additional-guardians/[requestId]/review/route";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import {
  requestAdditionalGuardian,
  reviewAdditionalGuardianRequest
} from "@/lib/supabase/additional-guardians";

vi.mock("@/lib/supabase/route-auth", () => ({ requireAuthenticatedRouteUser: vi.fn() }));
vi.mock("@/lib/supabase/additional-guardians", () => ({
  requestAdditionalGuardian: vi.fn(),
  reviewAdditionalGuardianRequest: vi.fn(),
  cancelAdditionalGuardianRequest: vi.fn(),
  revokeAdditionalGuardianAccess: vi.fn()
}));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const requestMock = vi.mocked(requestAdditionalGuardian);
const reviewMock = vi.mocked(reviewAdditionalGuardianRequest);

describe("additional guardian APIs", () => {
  it("derives the proposing parent from the verified session", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "parent-verified", email: "parent@example.com" } });
    requestMock.mockResolvedValue({ ok: true, message: "Request saved." });
    const response = await requestGuardian(new Request("http://localhost/api/parent/additional-guardians", {
      method: "POST",
      headers: { authorization: "Bearer token", "content-type": "application/json" },
      body: JSON.stringify({
        playerId: "player-1",
        email: "adult@example.com",
        relationship: "guardian",
        actorUserId: "attacker"
      })
    }));
    expect(response.status).toBe(201);
    expect(requestMock).toHaveBeenCalledWith({
      playerId: "player-1",
      actorUserId: "parent-verified",
      email: "adult@example.com",
      relationship: "guardian"
    });
  });

  it("derives the reviewing administrator from the verified session", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "admin-verified", email: "admin@example.com" } });
    reviewMock.mockResolvedValue({
      ok: true,
      message: "Approved.",
      invitationPath: "/invite/accept#token=secret",
      expiresAt: "2026-07-31T12:00:00.000Z",
      result: { request_id: "request-1" }
    });
    const response = await reviewGuardian(
      new Request("http://localhost/api/admin/additional-guardians/request-1/review", {
        method: "POST",
        headers: { authorization: "Bearer token", "content-type": "application/json" },
        body: JSON.stringify({ decision: "approve", reason: "Identity and scope verified.", actorUserId: "attacker" })
      }),
      { params: Promise.resolve({ requestId: "request-1" }) }
    );
    expect(response.status).toBe(200);
    expect(reviewMock).toHaveBeenCalledWith({
      requestId: "request-1",
      actorUserId: "admin-verified",
      decision: "approve",
      reason: "Identity and scope verified."
    });
  });

  it("rejects unsupported relationships before persistence", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "parent-verified" } });
    const response = await requestGuardian(new Request("http://localhost/api/parent/additional-guardians", {
      method: "POST",
      headers: { authorization: "Bearer token", "content-type": "application/json" },
      body: JSON.stringify({ playerId: "player-1", email: "adult@example.com", relationship: "coach" })
    }));
    expect(response.status).toBe(400);
  });
});
