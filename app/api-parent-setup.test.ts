import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./api/parent/setup/route";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { completeFamilyFirstSignIn } from "@/lib/supabase/family-onboarding";

vi.mock("@/lib/supabase/route-auth", () => ({ requireAuthenticatedRouteUser: vi.fn() }));
vi.mock("@/lib/supabase/family-onboarding", () => ({ completeFamilyFirstSignIn: vi.fn() }));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const completeMock = vi.mocked(completeFamilyFirstSignIn);

describe("parent first-sign-in API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, user: { id: "parent-1", email: "parent@example.com" } });
    completeMock.mockResolvedValue({ ok: true, message: "Preferences saved." });
  });

  it("derives the target adult from the verified session", async () => {
    const request = new Request("http://localhost/api/parent/setup", {
      method: "POST",
      headers: { authorization: "Bearer token", "content-type": "application/json" },
      body: JSON.stringify({
        language: "es",
        criticalChannel: "sms",
        routineChannel: "email",
        quietHoursStart: "21:00",
        quietHoursEnd: "07:00",
        timezone: "America/Chicago",
        translationEnabled: true,
        sharedDevicePreviews: false,
        userId: "attacker-controlled"
      })
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(completeMock).toHaveBeenCalledWith(expect.objectContaining({ userId: "parent-1", language: "es" }));
  });

  it("rejects unsigned requests", async () => {
    authMock.mockResolvedValue({ ok: false, message: "Authenticated Supabase session is required." });
    const response = await POST(new Request("http://localhost/api/parent/setup", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(completeMock).not.toHaveBeenCalled();
  });
});
