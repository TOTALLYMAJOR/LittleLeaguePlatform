import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as adminTransition } from "./api/admin/season-transitions/route";
import { POST as guardianResponse } from "./api/parent/season-transitions/[transitionId]/respond/route";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import {
  applySeasonTransition,
  closeSeasonTransition,
  proposeSeasonTransition,
  respondToSeasonTransition,
  revertSeasonTransition
} from "@/lib/supabase/season-transitions";

vi.mock("@/lib/supabase/route-auth", () => ({ requireAuthenticatedRouteUser: vi.fn() }));
vi.mock("@/lib/supabase/season-transitions", () => ({
  applySeasonTransition: vi.fn(),
  closeSeasonTransition: vi.fn(),
  proposeSeasonTransition: vi.fn(),
  respondToSeasonTransition: vi.fn(),
  revertSeasonTransition: vi.fn()
}));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const closeMock = vi.mocked(closeSeasonTransition);
const proposeMock = vi.mocked(proposeSeasonTransition);
const respondMock = vi.mocked(respondToSeasonTransition);

describe("season transition APIs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("derives the proposing administrator from the verified session", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "admin-verified" } });
    proposeMock.mockResolvedValue({ ok: true, message: "Review created." });
    const response = await adminTransition(new Request("http://localhost/api/admin/season-transitions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "propose",
        sourcePlayerId: "player-1",
        targetTeamId: "team-2",
        reason: "Age division alignment.",
        expiresAt: "2026-08-07T12:00:00.000Z",
        actorUserId: "attacker"
      })
    }));
    expect(response.status).toBe(200);
    expect(proposeMock).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: "admin-verified" }));
  });

  it("derives the responding guardian from the verified session", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "guardian-verified" } });
    respondMock.mockResolvedValue({ ok: true, message: "Response saved." });
    const response = await guardianResponse(
      new Request("http://localhost/api/parent/season-transitions/transition-1/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          decision: "accepted",
          expectedLockVersion: 3,
          note: "",
          actorUserId: "attacker"
        })
      }),
      { params: Promise.resolve({ transitionId: "transition-1" }) }
    );
    expect(response.status).toBe(200);
    expect(respondMock).toHaveBeenCalledWith({
      transitionId: "transition-1",
      actorUserId: "guardian-verified",
      decision: "accepted",
      note: "",
      expectedLockVersion: 3
    });
  });

  it("requires an attributed administrator close instead of silently expiring a review", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "admin-verified" } });
    closeMock.mockResolvedValue({ ok: true, message: "Review closed." });
    const response = await adminTransition(new Request("http://localhost/api/admin/season-transitions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "close",
        transitionId: "transition-1",
        reason: "Guardian review window ended.",
        expectedLockVersion: 4,
        actorUserId: "attacker"
      })
    }));
    expect(response.status).toBe(200);
    expect(closeMock).toHaveBeenCalledWith({
      transitionId: "transition-1",
      actorUserId: "admin-verified",
      reason: "Guardian review window ended.",
      expectedLockVersion: 4
    });
  });

  it("rejects unknown admin actions before any transition mutation", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "admin-verified" } });
    const response = await adminTransition(new Request("http://localhost/api/admin/season-transitions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "silently_move_child" })
    }));
    expect(response.status).toBe(400);
    expect(applySeasonTransition).not.toHaveBeenCalled();
    expect(closeSeasonTransition).not.toHaveBeenCalled();
    expect(revertSeasonTransition).not.toHaveBeenCalled();
  });
});
