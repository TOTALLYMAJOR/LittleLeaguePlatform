import { describe, expect, it } from "vitest";
import { seedState, type AppState } from "@/lib/domain";
import { buildFamilyMissionControl } from "./family-mission-control";

const now = "2026-04-01T12:00:00.000Z";

function build(state: AppState = seedState) {
  return buildFamilyMissionControl({
    state,
    parentUserId: "user-parent-jordan",
    handoffs: [],
    accessStatus: "live",
    isSupabaseBacked: true,
    message: "Current family records loaded.",
    now
  });
}

describe("family Mission Control read model", () => {
  it("scopes events to active guardian links without inventing family logistics", () => {
    const view = build();

    expect(view.children.map((child) => child.label)).toEqual(["Mason T."]);
    expect(view.events).toHaveLength(2);
    expect(view.events.every((event) => event.teamName === "Tiny Tigers")).toBe(true);
    expect(view.events.some((event) => event.teamName === "Happy Hawks")).toBe(false);
    expect(view.nextEvent).toMatchObject({
      eventId: "event-tigers-game",
      childLabel: "Mason T.",
      arrivalLabel: "Not published",
      leaveLabel: "Not planned",
      fieldLabel: "Not separately published",
      bringLabel: "Not published",
      responsibleAdultLabel: "Not assigned",
      sourceLabel: "Official team schedule · version 1"
    });
    expect(view.nextEvent?.unresolved).toEqual(expect.arrayContaining([
      "Official arrival time",
      "Family leave time",
      "Field",
      "Bring list",
      "Responsible adult",
      "RSVP"
    ]));
    expect(view.criticalChange).toBeUndefined();
  });

  it("requires RSVP review when the official schedule version advances", () => {
    const state: AppState = {
      ...seedState,
      events: seedState.events.map((event) => event.id === "event-tigers-game"
        ? { ...event, scheduleVersion: 2, updatedAt: "2026-04-01T10:00:00.000Z" }
        : event),
      rsvps: [
        ...seedState.rsvps,
        {
          id: "rsvp-mason-game",
          eventId: "event-tigers-game",
          playerId: "player-mason",
          parentUserId: "user-parent-jordan",
          response: "going",
          respondedAt: "2026-03-31T09:30:00.000Z",
          confirmedScheduleVersion: 1,
          createdAt: "2026-03-31T09:30:00.000Z",
          updatedAt: "2026-03-31T09:30:00.000Z"
        }
      ]
    };

    const view = build(state);

    expect(view.criticalChange?.title).toBe("Official schedule version changed");
    expect(view.nextEvent).toMatchObject({
      changed: true,
      rsvpOutdated: true,
      rsvpLabel: "Review after schedule change",
      primaryAction: { label: "Review RSVP", href: "/parent/rsvp" }
    });
  });

  it("explains official time overlaps across linked children without claiming travel analysis", () => {
    const state: AppState = {
      ...seedState,
      guardianLinks: [
        ...seedState.guardianLinks,
        {
          id: "guardian-ella-jordan",
          playerId: "player-ella",
          parentUserId: "user-parent-jordan",
          relationship: "guardian",
          status: "active"
        }
      ],
      events: seedState.events.map((event) => event.id === "event-hawks-game"
        ? {
          ...event,
          startsAt: "2026-04-04T09:30:00.000Z",
          endsAt: "2026-04-04T10:30:00.000Z"
        }
        : event)
    };

    const view = build(state);

    expect(view.children.map((child) => child.label)).toEqual(["Mason T.", "Ella Q."]);
    expect(view.conflicts).toHaveLength(1);
    expect(view.conflicts[0]?.summary).toContain("Mason T. and Ella Q.");
    expect(view.conflicts[0]?.evidence).toContain("Travel time is not included");
  });

  it("does not call one shared team event a sibling conflict", () => {
    const state: AppState = {
      ...seedState,
      guardianLinks: [
        ...seedState.guardianLinks,
        {
          id: "guardian-avery-jordan",
          playerId: "player-avery",
          parentUserId: "user-parent-jordan",
          relationship: "guardian",
          status: "active"
        }
      ]
    };

    expect(build(state).conflicts).toEqual([]);
  });

  it("withholds private event facts while family access is pending", () => {
    const view = buildFamilyMissionControl({
      state: seedState,
      parentUserId: "user-parent-jordan",
      handoffs: [],
      accessStatus: "missing_parent_link",
      isSupabaseBacked: false,
      message: "No active guardian link.",
      now
    });

    expect(view.state).toBe("access_pending");
    expect(view.children).toEqual([]);
    expect(view.events).toEqual([]);
    expect(view.offlineLabel).toBe("No private event pack is available.");
  });
});
