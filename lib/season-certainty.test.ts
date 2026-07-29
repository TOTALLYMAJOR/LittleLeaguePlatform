import { describe, expect, it } from "vitest";
import { seedState, type AppState } from "@/lib/domain";
import {
  buildAdminSeasonCertaintyView,
  buildCoachSeasonCertaintyView,
  buildParentSeasonCertaintyView
} from "./season-certainty";

const now = "2026-03-20T12:00:00.000Z";

describe("season certainty read models", () => {
  it("builds a parent view from scoped child and team rows only", () => {
    const view = buildParentSeasonCertaintyView({
      state: seedState,
      parentUserId: "user-parent-jordan",
      accessStatus: "live",
      message: "Scoped rows.",
      isSupabaseBacked: true,
      now
    });

    expect(view.viewer.scopeLabel).toContain("Scoped to linked children");
    expect(view.team.name).toBe("Tiny Tigers");
    expect(view.rsvp.rows.map((row) => row.playerName)).toEqual(["Mason T."]);
    expect(view.rsvp.rows.map((row) => row.playerName)).not.toContain("Noah B.");
    expect(view.photos.newApprovedCount).toBeGreaterThan(0);
    expect(view.privacyCopy).toContain("private to your team");
  });

  it("represents missing parent access without exposing private team facts", () => {
    const view = buildParentSeasonCertaintyView({
      state: { ...seedState, teams: [], players: [], guardianLinks: [], events: [], rsvps: [] },
      parentUserId: "user-parent-missing",
      accessStatus: "missing_parent_link",
      message: "No guardian link.",
      isSupabaseBacked: false,
      now
    });

    expect(view.viewer.canViewPrivateData).toBe(false);
    expect(view.team.name).toBe("No active team");
    expect(view.actions[0]?.label).toBe("Verify family access");
    expect(view.nextEvent.title).toBe("No upcoming event");
  });

  it("represents no upcoming parent event without inventing schedule data", () => {
    const view = buildParentSeasonCertaintyView({
      state: seedState,
      parentUserId: "user-parent-jordan",
      accessStatus: "live",
      message: "Scoped rows.",
      isSupabaseBacked: true,
      now: "2026-06-01T12:00:00.000Z"
    });

    expect(view.viewer.canViewPrivateData).toBe(true);
    expect(view.nextEvent.title).toBe("No upcoming event");
    expect(view.nextEvent.timeLabel).toBe("Schedule pending");
    expect(view.rsvp.rows).toEqual([
      expect.objectContaining({ playerName: "Mason T.", label: "No upcoming RSVP" })
    ]);
  });

  it("marks changed events and fallback freshness without presenting stale data as live", () => {
    const view = buildParentSeasonCertaintyView({
      state: {
        ...seedState,
        events: seedState.events.map((event) => event.id === "event-tigers-game"
          ? { ...event, locationName: "Field 2", updatedAt: "2026-03-20T10:30:00.000Z" }
          : event)
      },
      parentUserId: "user-parent-jordan",
      accessStatus: "live",
      message: "Fallback rows.",
      isSupabaseBacked: false,
      now
    });

    expect(view.nextEvent.status).toBe("changed");
    expect(view.changes[0]?.label).toContain("details changed");
    expect(view.actions.map((action) => action.cta)).toContain("Review change");
    expect(view.freshness.state).toBe("fallback");
    expect(view.freshness.staleCopy).toContain("not claiming live production freshness");
  });

  it("builds coach readiness without shame language or provider-send claims", () => {
    const view = buildCoachSeasonCertaintyView({
      state: seedState,
      coachUserId: "user-coach-taylor",
      accessStatus: "live",
      message: "Coach rows.",
      isSupabaseBacked: true,
      now
    });

    expect(view.attendance.noReply).toBeGreaterThanOrEqual(0);
    expect(view.actions[0]?.cta).toMatch(/Nudge missing replies|Review field status|Review coverage|Create update/);
    expect(view.drafts.reviewOnlyCopy).toContain("No autonomous publish or provider send");
    expect(JSON.stringify(view)).not.toMatch(/blame|shame|lazy/i);
  });

  it("builds admin overview queues from existing review records", () => {
    const state: AppState = {
      ...seedState,
      notifications: [{
        id: "notification-review",
        organizationId: seedState.organization.id,
        recipientUserId: "user-parent-jordan",
        teamId: "team-tigers",
        notificationType: "team_broadcast",
        title: "Draft message",
        body: "Review before delivery.",
        channel: "email",
        status: "pending",
        createdAt: now
      }]
    };
    const view = buildAdminSeasonCertaintyView({
      state,
      registrationRequests: seedState.registrationRequests,
      sponsors: seedState.sponsors,
      mediaItems: seedState.mediaItems,
      message: "Admin rows.",
      now
    });

    expect(view.organizationName).toBe(seedState.organization.name);
    expect(view.health.pendingRegistrations).toBeGreaterThanOrEqual(0);
    expect(view.health.messageDeliveryReview).toBeGreaterThan(0);
    expect(view.pendingQueues.map((queue) => queue.label)).toContain("Message Delivery Review");
    expect(view.security.detail).toContain("provider boundary");
  });
});
