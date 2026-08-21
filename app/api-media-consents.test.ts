import { describe, expect, it, vi } from "vitest";
import { POST } from "./api/parent/media-consents/route";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { recordParentMediaConsent } from "@/lib/supabase/media-consents";

vi.mock("@/lib/supabase/route-auth", () => ({ requireAuthenticatedRouteUser: vi.fn() }));
vi.mock("@/lib/supabase/media-consents", () => ({ recordParentMediaConsent: vi.fn() }));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const consentMock = vi.mocked(recordParentMediaConsent);

describe("parent media consent API", () => {
  it("derives the guardian from the verified session and ignores caller attribution", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "parent-verified" } });
    consentMock.mockResolvedValue({ ok: true, granted: false, message: "Consent revoked.", result: {} });

    const response = await POST(new Request("http://localhost/api/parent/media-consents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        playerId: "player-1",
        granted: false,
        parentUserId: "attacker"
      })
    }));

    expect(response.status).toBe(200);
    expect(consentMock).toHaveBeenCalledWith({
      playerId: "player-1",
      parentUserId: "parent-verified",
      granted: false
    });
  });
});
