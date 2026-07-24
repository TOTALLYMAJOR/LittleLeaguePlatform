import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./api/parent/replays/[replayId]/engagement/route";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { recordFamilyReplayEngagement } from "@/lib/supabase/family-replays";

vi.mock("@/lib/supabase/route-auth", () => ({ requireAuthenticatedRouteUser: vi.fn() }));
vi.mock("@/lib/supabase/family-replays", () => ({ recordFamilyReplayEngagement: vi.fn() }));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const engagementMock = vi.mocked(recordFamilyReplayEngagement);

describe("family Parent Replay engagement API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("derives the guardian from the verified session", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "guardian-verified" } });
    engagementMock.mockResolvedValue({ ok: true, message: "Saved." });
    const response = await POST(new Request("http://localhost/api/parent/replays/replay-1/engagement", {
      method: "POST",
      headers: { authorization: "Bearer token", "content-type": "application/json" },
      body: JSON.stringify({ operation: "saved", parentUserId: "attacker" })
    }), { params: Promise.resolve({ replayId: "replay-1" }) });
    expect(response.status).toBe(200);
    expect(engagementMock).toHaveBeenCalledWith({
      replayId: "replay-1",
      parentUserId: "guardian-verified",
      operation: "saved"
    });
  });

  it("rejects unsupported state changes before the service call", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "guardian-verified" } });
    const response = await POST(new Request("http://localhost/api/parent/replays/replay-1/engagement", {
      method: "POST",
      headers: { authorization: "Bearer token", "content-type": "application/json" },
      body: JSON.stringify({ operation: "publish" })
    }), { params: Promise.resolve({ replayId: "replay-1" }) });
    expect(response.status).toBe(400);
    expect(engagementMock).not.toHaveBeenCalled();
  });
});
