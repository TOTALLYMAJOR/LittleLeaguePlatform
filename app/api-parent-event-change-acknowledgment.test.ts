import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./api/parent/event-changes/acknowledge/route";
import { acknowledgeEventChange } from "@/lib/supabase/event-change-receipts";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

vi.mock("@/lib/supabase/route-auth", () => ({ requireAuthenticatedRouteUser: vi.fn() }));
vi.mock("@/lib/supabase/event-change-receipts", () => ({ acknowledgeEventChange: vi.fn() }));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const acknowledgeMock = vi.mocked(acknowledgeEventChange);
const changeId = "5a555555-5555-4555-8555-555555555551";

function request(body: unknown) {
  return new Request("http://localhost/api/parent/event-changes/acknowledge", {
    method: "POST",
    headers: { authorization: "Bearer token", "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("parent event change acknowledgment API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without a verified Supabase session", async () => {
    authMock.mockResolvedValue({ ok: false, message: "Authenticated Supabase session is required." });

    const response = await POST(request({ eventChangeLogId: changeId }));

    expect(response.status).toBe(401);
    expect(acknowledgeMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed identifier before the service boundary", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "guardian-verified" } });

    const response = await POST(request({ eventChangeLogId: { spoofed: changeId } }));

    expect(response.status).toBe(400);
    expect(acknowledgeMock).not.toHaveBeenCalled();
  });

  it("derives the guardian from the verified session and records acknowledgment", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "guardian-verified" } });
    acknowledgeMock.mockResolvedValue({
      ok: true,
      code: "recorded",
      message: "Event change acknowledged.",
      operation: "acknowledged",
      idempotentReplay: false,
      seenAt: "2026-08-19T10:00:00.000Z",
      acknowledgedAt: "2026-08-19T10:00:00.000Z"
    });

    const response = await POST(request({
      eventChangeLogId: changeId,
      operation: "acknowledged",
      parentUserId: "attacker"
    }));

    expect(response.status).toBe(200);
    expect(acknowledgeMock).toHaveBeenCalledWith({
      eventChangeLogId: changeId,
      parentUserId: "guardian-verified",
      operation: "acknowledged"
    });
  });

  it("allows the presentation-only seen operation without treating it as acknowledgment", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "guardian-verified" } });
    acknowledgeMock.mockResolvedValue({
      ok: true,
      code: "recorded",
      message: "Event change marked seen.",
      operation: "seen",
      idempotentReplay: false,
      seenAt: "2026-08-19T10:00:00.000Z",
      acknowledgedAt: null
    });

    const response = await POST(request({ eventChangeLogId: changeId, operation: "seen" }));

    expect(response.status).toBe(200);
    expect(acknowledgeMock).toHaveBeenCalledWith(expect.objectContaining({ operation: "seen" }));
  });

  it("maps SQL scope denial to 403", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "guardian-verified" } });
    acknowledgeMock.mockResolvedValue({
      ok: false,
      code: "forbidden",
      message: "Event change is not available to this guardian.",
      operation: "acknowledged",
      idempotentReplay: false,
      seenAt: null,
      acknowledgedAt: null
    });

    const response = await POST(request({ eventChangeLogId: changeId }));

    expect(response.status).toBe(403);
  });
});
