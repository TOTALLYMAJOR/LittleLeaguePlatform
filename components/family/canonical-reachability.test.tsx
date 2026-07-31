import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getParentMoreDestinations,
  getRouteEntry,
  type ClientShellAccess
} from "@/lib/navigation/route-topology";

const parentAccess: ClientShellAccess = {
  signedIn: true,
  userId: "parent-1",
  canParent: true,
  canCoach: false,
  canAdmin: false,
  activeRole: "parent",
  activeRoleSource: "route-required",
  roleSwitchLinks: [{ href: "/parent", label: "Parent Home", role: "parent" }],
  contexts: [{
    contextKey: "parent:org-1:season-1:team-1",
    role: "parent",
    organizationId: "org-1",
    organizationName: "League",
    seasonId: "season-1",
    seasonName: "Spring",
    teamId: "team-1",
    teamName: "Tiny Tigers",
    actorUserId: "parent-1",
    permittedTeamIds: ["team-1"],
    permittedPlayerIds: ["player-1"],
    archived: false,
    readOnly: false
  }]
};

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("LP-UX-002 canonical capability reachability", () => {
  it("keeps every retained destination in topology, Family navigation, More, or a precise record link", () => {
    const canonicalRoutes = [
      "/parent",
      "/parent/schedule",
      "/parent/rsvp",
      "/parent/messages",
      "/parent/transportation",
      "/parent/practice-recaps",
      "/parent/photos",
      "/parent/family-access",
      "/parent/settings",
      "/account"
    ];
    for (const route of canonicalRoutes) {
      expect(getRouteEntry(route), `${route} must remain a canonical topology entry`).toBeTruthy();
    }

    const moreRoutes = getParentMoreDestinations(parentAccess).map((entry) => entry.href);
    expect(moreRoutes).toEqual(expect.arrayContaining([
      "/parent/practice-recaps",
      "/parent/photos",
      "/parent/transportation",
      "/parent/settings",
      "/account"
    ]));

    const dashboard = source("components/parent-weekly-dashboard.tsx");
    const contextualActions = [
      dashboard,
      source("components/family/event-passport.tsx"),
      source("components/family/readiness.ts")
    ].join("\n");
    expect(contextualActions).toContain("/parent/schedule?eventId=");
    expect(contextualActions).toContain("/parent/rsvp?eventId=");
    expect(dashboard).toContain('href="/parent/messages"');
    expect(dashboard).toContain('href="/parent/practice-recaps"');
    expect(dashboard).toContain('href="/parent/family-access"');

    const readiness = source("components/family/readiness.ts");
    expect(readiness).toContain("#communication-message-");
    expect(readiness).toContain("#transportation-request-");

    const passport = source("components/family/event-passport.tsx");
    expect(passport).toContain("#caregiver-coordination");

    const surfaces = source("app/parent/_surfaces.tsx");
    expect(surfaces).toContain("<FamilyFlightPlanClient");
    expect(surfaces).toContain('id="caregiver-coordination"');
  });

  it("documents the disposition of all four removed deep-operations component regions", () => {
    const matrix = source("docs/product-experience/leaguepilot/lp-ux-002-canonical-route-reachability.md");
    for (const previousItem of [
      "Family Mission Control",
      "Family Flight Plan",
      "Official notification receipt",
      "General ParentDashboard"
    ]) {
      expect(matrix).toContain(previousItem);
    }
    expect(matrix).toContain("Duplicate catch-all presentation safely removed");
    expect(matrix).not.toContain("Still missing a canonical destination");
  });
});
