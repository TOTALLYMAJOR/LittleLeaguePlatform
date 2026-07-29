import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("parent and coach dashboard Supabase reads", () => {
  it("keeps parent and coach routes wired through the shared Supabase read adapter", () => {
    for (const route of ["app/parent/page.tsx", "app/parent/rsvp/page.tsx", "app/coach/page.tsx", "app/coach/rsvps/page.tsx"]) {
      const file = source(route);

      expect(file, `${route} should render through a guarded route surface`).toContain("Surface");
      expect(file, `${route} should not prerender live Supabase reads at build time`).toContain("force-dynamic");
    }

    const parentSurfaces = source("app/parent/_surfaces.tsx");
    const coachSurfaces = source("app/coach/_surfaces.tsx");

    expect(parentSurfaces).toContain("requireParentPageAccess");
    expect(parentSurfaces).toContain("listParentCoachDashboardData");
    expect(parentSurfaces).toContain("dashboardData={dashboardData}");
    expect(coachSurfaces).toContain("requireCoachPageAccess");
    expect(coachSurfaces).toContain("listParentCoachDashboardData");
    expect(coachSurfaces).toContain("dashboardData={dashboardData}");
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
      "rsvp_change_logs",
      "notification_preferences",
      "snack_schedule_slots",
      "volunteer_signups",
      "weather_alerts"
    ]) {
      expect(adapter, `${table} should be part of the dashboard read model`).toContain(`from("${table}")`);
    }

    expect(adapter).toContain("viewerUserId");
    expect(adapter).toContain("scopeParentState");
    expect(adapter).toContain("scopeCoachState");
    expect(adapter).toContain("readWithSchemaFallback");
    expect(adapter).toContain("confirmed_schedule_version,lock_version,last_updated_by_user_id,client_action_id");
    expect(adapter).toContain("private_object_path,scan_completed_at,family_release_approved_at");
    expect(adapter).toContain("snackScheduleSlots: state.snackScheduleSlots.filter((slot) => teamIds.has(slot.teamId))");
    expect(adapter).toContain("volunteerSignups: state.volunteerSignups.filter((signup) => teamIds.has(signup.teamId))");
  });
});
