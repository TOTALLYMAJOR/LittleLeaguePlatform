import { describe, expect, it } from "vitest";
import { buildTenantReadinessData } from "./tenant-readiness";

const org = { id: "org-a", name: "League A" };
const otherOrg = { id: "org-b", name: "League B" };
const season = {
  id: "season-a",
  organization_id: org.id,
  name: "Spring 2026",
  status: "active" as const,
  starts_at: "2026-03-01T00:00:00.000Z",
  ends_at: "2026-06-01T00:00:00.000Z"
};
const team = {
  id: "team-a",
  organization_id: org.id,
  season_id: season.id,
  name: "Tiny Tigers",
  status: "active" as const,
  coach_user_id: "coach-a"
};
const player = {
  id: "player-a",
  organization_id: org.id,
  team_id: team.id,
  season_id: season.id,
  roster_status: "active" as const
};

describe("tenant readiness", () => {
  it("marks a tenant ready to invite when the season, team, coach, roster, family path, and schedule exist", () => {
    const data = buildTenantReadinessData({
      organizations: [org],
      seasons: [season],
      teams: [team],
      players: [player],
      teamMemberships: [
        { team_id: team.id, user_id: "coach-a", role: "coach", status: "active" },
        { team_id: team.id, user_id: "parent-a", role: "parent", status: "active" }
      ],
      guardianLinks: [{ player_id: player.id, parent_user_id: "parent-a", status: "active" }],
      registrationRequests: [],
      events: [{ id: "event-a", organization_id: org.id, team_id: team.id, season_id: season.id, status: "scheduled" }]
    });

    expect(data.tenants).toHaveLength(1);
    expect(data.tenants[0]?.readiness).toBe("ready_to_invite");
    expect(data.tenants[0]?.readyToInviteFamilies).toBe(true);
    expect(data.tenants[0]?.blockingCount).toBe(0);
    expect(data.tenants[0]?.checks[0]).toMatchObject({
      responsibleAuthority: "League administrator.",
      privacyBoundary: expect.stringContaining("no custody"),
      explanation: expect.stringContaining("does not change records")
    });
  });

  it("ignores rows from other organizations when computing a tenant checklist", () => {
    const data = buildTenantReadinessData({
      organizations: [org],
      seasons: [season, { ...season, id: "season-b", organization_id: otherOrg.id }],
      teams: [{ ...team, coach_user_id: null }, { ...team, id: "team-b", organization_id: otherOrg.id, season_id: "season-b", coach_user_id: "coach-b" }],
      players: [{ ...player, id: "player-b", organization_id: otherOrg.id, team_id: "team-b", season_id: "season-b" }],
      teamMemberships: [{ team_id: "team-b", user_id: "coach-b", role: "coach", status: "active" }],
      guardianLinks: [{ player_id: "player-b", parent_user_id: "parent-b", status: "active" }],
      registrationRequests: [],
      events: [{ id: "event-b", organization_id: otherOrg.id, team_id: "team-b", season_id: "season-b", status: "scheduled" }]
    });

    const tenant = data.tenants[0];

    expect(tenant?.organizationId).toBe(org.id);
    expect(tenant?.activeTeamCount).toBe(1);
    expect(tenant?.activeCoachTeamCount).toBe(0);
    expect(tenant?.rosteredPlayerCount).toBe(0);
    expect(tenant?.scheduledEventCount).toBe(0);
    expect(tenant?.checks.find((item) => item.id === "coach-coverage")?.status).toBe("needs_attention");
    expect(tenant?.checks.find((item) => item.id === "roster")?.status).toBe("needs_attention");
  });
});
