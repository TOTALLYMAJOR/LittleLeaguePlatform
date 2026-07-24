import { describe, expect, it, vi } from "vitest";
import { POST } from "./api/invites/accept/route";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { acceptParentInvite } from "@/lib/supabase/invite-acceptance";

vi.mock("@/lib/supabase/route-auth", () => ({ requireAuthenticatedRouteUser: vi.fn() }));
vi.mock("@/lib/supabase/invite-acceptance", () => ({ acceptParentInvite: vi.fn(), previewParentInvite: vi.fn() }));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const acceptMock = vi.mocked(acceptParentInvite);

describe("invite acceptance API", () => {
  it("derives the accepting adult from the verified session", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "parent-1", email: "parent@example.com" } });
    acceptMock.mockResolvedValue({ ok: true, message: "Invitation accepted." });
    const response = await POST(new Request("http://localhost/api/invites/accept", {
      method: "POST",
      headers: { authorization: "Bearer token", "content-type": "application/json" },
      body: JSON.stringify({ token: "a".repeat(32), userId: "attacker" })
    }));
    expect(response.status).toBe(200);
    expect(acceptMock).toHaveBeenCalledWith({ token: "a".repeat(32), userId: "parent-1" });
  });
});
