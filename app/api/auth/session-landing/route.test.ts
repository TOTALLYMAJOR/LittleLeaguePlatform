import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getServerShellAccess } from "@/lib/supabase/shell-access";
import { getFamilyOnboardingStatus } from "@/lib/supabase/family-onboarding";

vi.mock("@/lib/supabase/shell-access", () => ({
  getServerShellAccess: vi.fn()
}));
vi.mock("@/lib/supabase/family-onboarding", () => ({
  getFamilyOnboardingStatus: vi.fn()
}));

const getAccessMock = vi.mocked(getServerShellAccess);
const getOnboardingMock = vi.mocked(getFamilyOnboardingStatus);

function access(overrides: Partial<Awaited<ReturnType<typeof getServerShellAccess>>> = {}) {
  return {
    signedIn: true,
    userId: "user-session",
    canParent: false,
    canCoach: false,
    canAdmin: false,
    roleSwitchLinks: [],
    parentTeamIds: [],
    coachTeamIds: [],
    adminOrganizationIds: [],
    adminTeamIds: [],
    ...overrides
  };
}

describe("auth session landing", () => {
  it("sends organization admins to the admin dashboard first", async () => {
    getAccessMock.mockResolvedValue(access({ canAdmin: true, adminOrganizationIds: ["org-1"], adminTeamIds: ["team-1"] }));

    const response = await GET();

    await expect(response.json()).resolves.toMatchObject({ ok: true, href: "/admin" });
  });

  it("sends approved parents to parent home", async () => {
    getAccessMock.mockResolvedValue(access({ canParent: true, parentTeamIds: ["team-1"] }));
    getOnboardingMock.mockResolvedValue({ available: true, completed: true });

    const response = await GET();

    await expect(response.json()).resolves.toMatchObject({ ok: true, href: "/parent" });
  });

  it("sends a newly linked parent through first-sign-in setup", async () => {
    getAccessMock.mockResolvedValue(access({ canParent: true, parentTeamIds: ["team-1"] }));
    getOnboardingMock.mockResolvedValue({ available: true, completed: false });
    const response = await GET();
    await expect(response.json()).resolves.toMatchObject({ ok: true, href: "/parent/setup" });
  });

  it("sends signed-in accounts without active access to account status", async () => {
    getAccessMock.mockResolvedValue(access());

    const response = await GET();

    await expect(response.json()).resolves.toMatchObject({ ok: true, href: "/account" });
  });
});
