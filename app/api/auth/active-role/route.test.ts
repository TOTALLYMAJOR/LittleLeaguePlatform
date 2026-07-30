import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getServerShellAccess } from "@/lib/supabase/shell-access";
import type { ActiveContext } from "@/lib/operational-truth";

vi.mock("@/lib/supabase/shell-access", () => ({
  getServerShellAccess: vi.fn()
}));

const getAccessMock = vi.mocked(getServerShellAccess);

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
    contexts: [],
    ...overrides
  };
}

function request(role: unknown) {
  return new Request("https://leaguepilot.test/api/auth/active-role", {
    method: "POST",
    body: JSON.stringify({ role })
  });
}

const parentContext: ActiveContext = {
  actorUserId: "user-session",
  role: "parent",
  organizationId: "org-1",
  organizationName: "LeaguePilot Demo League",
  seasonId: "season-1",
  seasonName: "Spring 2026",
  teamId: "team-1",
  teamName: "Rockets",
  permittedTeamIds: ["team-1"],
  permittedPlayerIds: ["player-1"],
  contextKey: "parent:org-1:season-1:team-1",
  archived: false,
  readOnly: false
};

describe("active role cookie", () => {
  it("sets a server-readable role cookie only for a confirmed current membership", async () => {
    getAccessMock.mockResolvedValue(access({
      canParent: true,
      parentTeamIds: ["team-1"],
      contexts: [parentContext]
    }));

    const response = await POST(request("parent"));

    await expect(response.json()).resolves.toMatchObject({ ok: true, href: "/parent" });
    expect(response.headers.get("set-cookie")).toContain("leaguepilot-active-role=parent");
  });

  it("rejects signed-out and unsupported role choices", async () => {
    getAccessMock.mockResolvedValue(access({ signedIn: false }));
    expect((await POST(request("parent"))).status).toBe(401);

    getAccessMock.mockResolvedValue(access({
      canParent: true,
      parentTeamIds: ["team-1"],
      contexts: []
    }));
    expect((await POST(request("admin"))).status).toBe(403);
    expect((await POST(request("owner"))).status).toBe(400);
  });
});
