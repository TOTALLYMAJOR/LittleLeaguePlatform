import { beforeEach, describe, expect, it, vi } from "vitest";
import { repairGuardianLink } from "./guardian-links";
import { createSupabaseAdminClient } from "./admin";
import { requireActiveOrganizationAdmin } from "./access-control";

vi.mock("./admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("./access-control", () => ({
  requireActiveOrganizationAdmin: vi.fn(),
}));

const createSupabaseAdminClientMock = vi.mocked(createSupabaseAdminClient);
const requireActiveOrganizationAdminMock = vi.mocked(
  requireActiveOrganizationAdmin,
);

describe("guardian repair verification boundary", () => {
  beforeEach(() => {
    requireActiveOrganizationAdminMock.mockResolvedValue({
      ok: true,
      message: "Admin access granted.",
    });
  });

  it("requires a bounded verification note before attempting persistence", async () => {
    const result = await repairGuardianLink({
      organizationId: "org-1",
      actorUserId: "admin-1",
      playerId: "player-1",
      parentUserId: "parent-1",
      relationship: "guardian",
      verificationNote: "short",
    });

    expect(result).toEqual({
      ok: false,
      message:
        "Guardian repair requires organization, admin, player, parent, and a 10-500 character verification note.",
    });
  });

  it("requires the selected account to be an existing parent profile", async () => {
    const query = (table: string) => {
      let data: unknown = null;
      if (table === "players")
        data = { id: "player-1", team_id: "team-1", organization_id: "org-1" };
      if (table === "profiles") data = { id: "coach-1", default_role: "coach" };
      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.eq = () => builder;
      builder.single = () => builder;
      builder.then = (resolve: (value: { data: unknown }) => unknown) =>
        Promise.resolve({ data }).then(resolve);
      return builder;
    };
    createSupabaseAdminClientMock.mockReturnValue({ from: query } as never);

    const result = await repairGuardianLink({
      organizationId: "org-1",
      actorUserId: "admin-1",
      playerId: "player-1",
      parentUserId: "coach-1",
      relationship: "guardian",
      verificationNote: "Confirmed with family access records.",
    });

    expect(result).toEqual({
      ok: false,
      message: "Guardian repair requires an existing parent profile.",
    });
  });
});
