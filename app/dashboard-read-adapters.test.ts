import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("parent and coach dashboard Supabase reads", () => {
  it("keeps parent and coach routes wired through the shared Supabase read adapter", () => {
    for (const route of ["app/parent/page.tsx", "app/parent/rsvp/page.tsx", "app/coach/page.tsx"]) {
      const file = source(route);

      expect(file, `${route} should resolve the signed-in Supabase server user`).toContain("getSupabaseServerUser");
      expect(file, `${route} should load persisted dashboard rows`).toContain("listParentCoachDashboardData");
      expect(file, `${route} should pass dashboard data into the client`).toContain("dashboardData={dashboardData}");
      expect(file, `${route} should not prerender live Supabase reads at build time`).toContain("force-dynamic");
    }
  });

  it("keeps the shared adapter reading the rows that drive parent and coach action payloads", () => {
    const adapter = source("lib/supabase/dashboard-data.ts");

    for (const table of [
      "profiles",
      "team_memberships",
      "players",
      "player_guardians",
      "events",
      "rsvps",
      "snack_schedule_slots",
      "volunteer_signups",
      "weather_alerts"
    ]) {
      expect(adapter, `${table} should be part of the dashboard read model`).toContain(`from("${table}")`);
    }

    expect(adapter).toContain("viewerUserId");
    expect(adapter).toContain("scopeParentState");
    expect(adapter).toContain("scopeCoachState");
    expect(adapter).toContain("snackScheduleSlots: state.snackScheduleSlots.filter((slot) => teamIds.has(slot.teamId))");
    expect(adapter).toContain("volunteerSignups: state.volunteerSignups.filter((signup) => teamIds.has(signup.teamId))");
  });
});
