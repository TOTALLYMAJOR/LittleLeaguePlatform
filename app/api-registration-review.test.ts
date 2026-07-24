import { describe, expect, it, vi } from "vitest";
import { POST as approveRegistration } from "./api/admin/registration-requests/[requestId]/approve/route";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { approveRegistrationRequest } from "@/lib/supabase/registration-approvals";

vi.mock("@/lib/supabase/route-auth", () => ({ requireAuthenticatedRouteUser: vi.fn() }));
vi.mock("@/lib/supabase/registration-approvals", () => ({
  approveRegistrationRequest: vi.fn()
}));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const approveMock = vi.mocked(approveRegistrationRequest);

describe("registration review API", () => {
  it("derives the attributed reviewer from the verified session", async () => {
    authMock.mockResolvedValue({ ok: true, user: { id: "admin-verified" } });
    approveMock.mockResolvedValue({
      ok: true,
      message: "Registration approved.",
      invitationPath: "/invite/accept#token=one-time",
      expiresAt: "2026-07-31T12:00:00.000Z"
    });
    const response = await approveRegistration(
      new Request("http://localhost/api/admin/registration-requests/request-1/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          note: "Roster and registration record matched.",
          reviewerUserId: "attacker"
        })
      }),
      { params: Promise.resolve({ requestId: "request-1" }) }
    );
    expect(response.status).toBe(200);
    expect(approveMock).toHaveBeenCalledWith({
      requestId: "request-1",
      reviewerUserId: "admin-verified",
      note: "Roster and registration record matched."
    });
  });
});
