import { describe, expect, it, vi } from "vitest";
import { POST as createAuthorization } from "./api/parent/caregiver-authorizations/route";
import { POST as revokeAuthorization } from "./api/parent/caregiver-authorizations/[authorizationId]/revoke/route";
import { POST as acceptAuthorization } from "./api/caregiver/authorizations/accept/route";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import {
  acceptTemporaryCaregiverAuthorization,
  createTemporaryCaregiverAuthorization,
  revokeTemporaryCaregiverAuthorization
} from "@/lib/supabase/temporary-caregivers";

vi.mock("@/lib/supabase/route-auth", () => ({ requireAuthenticatedRouteUser: vi.fn() }));
vi.mock("@/lib/supabase/temporary-caregivers", () => ({
  createTemporaryCaregiverAuthorization: vi.fn(),
  previewTemporaryCaregiverInvitation: vi.fn(),
  acceptTemporaryCaregiverAuthorization: vi.fn(),
  revokeTemporaryCaregiverAuthorization: vi.fn()
}));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const createMock = vi.mocked(createTemporaryCaregiverAuthorization);
const acceptMock = vi.mocked(acceptTemporaryCaregiverAuthorization);
const revokeMock = vi.mocked(revokeTemporaryCaregiverAuthorization);

describe("temporary caregiver APIs", () => {
  it("derives the authorizing guardian from the verified session", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "guardian-verified" } });
    createMock.mockResolvedValue({
      ok: true,
      message: "Authorized.",
      authorizationId: "authorization-1",
      invitationPath: "/caregiver/accept#token=secret",
      inviteExpiresAt: "2026-08-01T12:00:00.000Z"
    });
    const response = await createAuthorization(new Request("http://localhost/api/parent/caregiver-authorizations", {
      method: "POST",
      headers: { authorization: "Bearer token", "content-type": "application/json" },
      body: JSON.stringify({
        playerId: "player-1",
        caregiverEmail: "caregiver@example.com",
        eventIds: ["event-1"],
        allowPickup: false,
        startsAt: "2026-08-02T12:00:00.000Z",
        expiresAt: "2026-08-03T12:00:00.000Z",
        actorUserId: "attacker"
      })
    }));
    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: "guardian-verified",
      playerId: "player-1",
      caregiverEmail: "caregiver@example.com"
    }));
  });

  it("derives the accepting caregiver from the verified session", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "caregiver-verified" } });
    acceptMock.mockResolvedValue({ ok: true, message: "Accepted.", result: {} });
    const response = await acceptAuthorization(new Request("http://localhost/api/caregiver/authorizations/accept", {
      method: "POST",
      headers: { authorization: "Bearer token", "content-type": "application/json" },
      body: JSON.stringify({ token: "a".repeat(43), actorUserId: "attacker" })
    }));
    expect(response.status).toBe(200);
    expect(acceptMock).toHaveBeenCalledWith({
      token: "a".repeat(43),
      actorUserId: "caregiver-verified"
    });
  });

  it("requires a reason and derives the revoking actor from the verified session", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "guardian-verified" } });
    revokeMock.mockResolvedValue({ ok: true, message: "Revoked.", result: {} });
    const response = await revokeAuthorization(
      new Request("http://localhost/api/parent/caregiver-authorizations/authorization-1/revoke", {
        method: "POST",
        headers: { authorization: "Bearer token", "content-type": "application/json" },
        body: JSON.stringify({ reason: "Care window ended early.", actorUserId: "attacker" })
      }),
      { params: Promise.resolve({ authorizationId: "authorization-1" }) }
    );
    expect(response.status).toBe(200);
    expect(revokeMock).toHaveBeenCalledWith({
      authorizationId: "authorization-1",
      actorUserId: "guardian-verified",
      reason: "Care window ended early."
    });
  });
});
