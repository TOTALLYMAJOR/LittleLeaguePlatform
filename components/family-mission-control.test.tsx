import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { seedState } from "@/lib/domain";
import { buildFamilyMissionControl } from "@/lib/family-mission-control";
import { FamilyMissionControlClient } from "./family-mission-control";

describe("FamilyMissionControlClient", () => {
  it("puts the next action and honest Event Passport facts before the family agenda", () => {
    const view = buildFamilyMissionControl({
      state: seedState,
      parentUserId: "user-parent-jordan",
      handoffs: [],
      accessStatus: "live",
      isSupabaseBacked: true,
      message: "Current family records loaded.",
      now: "2026-04-01T12:00:00.000Z"
    });

    const html = renderToStaticMarkup(<FamilyMissionControlClient view={view} />);

    expect(html).toContain("Family Mission Control");
    expect(html).toContain("Next: Mason T. · Tiny Tigers vs Rookie Rockets");
    expect(html).toContain("Event Passport · official schedule v1");
    expect(html).toContain("Not planned");
    expect(html).toContain("Not published");
    expect(html).toContain("Not separately published");
    expect(html).toContain("Not assigned");
    expect(html).toContain("7 unresolved");
    expect(html).toContain("Outbound responsibility");
    expect(html).toContain("Return responsibility");
    expect(html).toContain("RSVP now");
    expect(html).toContain("Your next seven days");
    expect(html).toContain("Opponent Rookie Rockets");
    expect(html).toContain("data-analytics-surface=\"family_mission_control\"");
    expect(html).toContain("data-analytics-event=\"event_passport_viewed\"");
    expect(html).not.toMatch(/Arrive 20 minutes|Leave by.{0,20}\\d|inferred arrival/i);
  });

  it("renders a private-data-safe access pending state", () => {
    const view = buildFamilyMissionControl({
      state: seedState,
      parentUserId: "user-parent-jordan",
      handoffs: [],
      accessStatus: "missing_parent_link",
      isSupabaseBacked: false,
      message: "Family access is still being verified.",
      now: "2026-04-01T12:00:00.000Z"
    });

    const html = renderToStaticMarkup(<FamilyMissionControlClient view={view} />);

    expect(html).toContain("No upcoming Event Passport");
    expect(html).toContain("Family access must be active");
    expect(html).toContain("Review family access");
    expect(html).not.toContain("Tiny Tigers vs Rookie Rockets");
  });
});
