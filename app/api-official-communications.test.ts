import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./api/official-communications/publish/route";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { publishOfficialCommunicationVersion } from "@/lib/supabase/official-communications";

vi.mock("@/lib/supabase/route-auth", () => ({ requireAuthenticatedRouteUser: vi.fn() }));
vi.mock("@/lib/supabase/official-communications", () => ({
  publishOfficialCommunicationVersion: vi.fn()
}));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const publishMock = vi.mocked(publishOfficialCommunicationVersion);

describe("official communication publish API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("derives the publisher from the verified session", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "verified-admin" } });
    publishMock.mockResolvedValue({
      ok: true,
      message: "Published.",
      threadId: "thread-1",
      versionId: "version-1",
      versionNumber: 1,
      eventScheduleVersion: 3,
      notificationCount: 4,
      providerExecution: "not_started"
    });
    const response = await POST(new Request("http://localhost/api/official-communications/publish", {
      method: "POST",
      headers: {
        authorization: "Bearer token",
        "content-type": "application/json",
        "Idempotency-Key": "official-message-action-1234"
      },
      body: JSON.stringify({
        actorUserId: "attacker",
        eventId: "event-1",
        action: "published",
        category: "official_update",
        priority: "action_required",
        title: "Arrival time changed",
        body: "Please arrive at 5:30 PM.",
        reason: "Coach confirmed the updated arrival time.",
        expectedThreadVersion: 0,
        expectedScheduleVersion: 3
      })
    }));
    expect(response.status).toBe(201);
    expect(publishMock).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: "verified-admin",
      eventId: "event-1",
      expectedScheduleVersion: 3,
      idempotencyKey: "official-message-action-1234"
    }));
  });

  it("fails before mutation without a verified session", async () => {
    authMock.mockResolvedValue({ ok: false, message: "Sign in required." });
    const response = await POST(new Request("http://localhost/api/official-communications/publish", {
      method: "POST",
      body: "{}"
    }));
    expect(response.status).toBe(401);
    expect(publishMock).not.toHaveBeenCalled();
  });
});
