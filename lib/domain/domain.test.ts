import { describe, expect, it } from "vitest";
import {
  NOW,
  analyzeRosterCsv,
  applyScheduleChange,
  computeAdminHealth,
  evaluateInviteRecovery,
  canModerateTeamChat,
  getCoachRsvpSummaries,
  getParentDashboard,
  getTeamChatAccess,
  getTeamChatView,
  sampleRosterCsv,
  seedState,
  setRsvp
} from "./index";

describe("CSV duplicate detection", () => {
  it("separates blocking duplicate-player errors from reviewable warnings", () => {
    const analysis = analyzeRosterCsv(sampleRosterCsv, seedState, NOW);

    expect(analysis.errorRows).toBeGreaterThan(0);
    expect(analysis.warningRows).toBeGreaterThan(0);
    expect(analysis.rows.flatMap((row) => row.issues.map((issue) => issue.code))).toContain("duplicate_player_same_team");
    expect(analysis.rows.flatMap((row) => row.issues.map((issue) => issue.code))).toContain("duplicate_jersey_number");
  });

  it("blocks missing parent contact when both email and phone are invalid", () => {
    const csv = [
      "team,division,player_first,last_initial,jersey,parent_name,parent_email,parent_phone",
      "Tiny Tigers,3U,New,N,9,No Contact,not-an-email,"
    ].join("\n");
    const analysis = analyzeRosterCsv(csv, seedState, NOW);

    expect(analysis.errorRows).toBe(1);
    expect(analysis.rows[0]?.issues.map((issue) => issue.code)).toContain("invalid_required_parent_contact");
  });
});

describe("invite recovery", () => {
  it("allows a pending invite under resend limits", () => {
    const result = evaluateInviteRecovery(seedState, "sam@example.com", NOW);
    expect(result.code).toBe("eligible");
    expect(result.canResend).toBe(true);
  });

  it("detects expired, accepted, not-found, and hourly-limited invites", () => {
    expect(evaluateInviteRecovery(seedState, "pat@example.com", NOW).code).toBe("expired");
    expect(evaluateInviteRecovery(seedState, "jordan@example.com", NOW).code).toBe("already_registered");
    expect(evaluateInviteRecovery(seedState, "missing@example.com", NOW).code).toBe("not_found");
    expect(evaluateInviteRecovery(seedState, "limit@example.com", NOW).code).toBe("rate_limited_hour");
  });
});

describe("parent dashboard and RSVP", () => {
  it("loads only parent-linked child, events, announcement, and RSVP needs", () => {
    const dashboard = getParentDashboard(seedState, "user-parent-jordan", NOW);

    expect(dashboard.children).toHaveLength(1);
    expect(dashboard.children[0]?.player.firstName).toBe("Mason");
    expect(dashboard.nextEvents.length).toBeGreaterThan(0);
    expect(dashboard.latestAnnouncement?.title).toBe("Opening weekend notes");
    expect(dashboard.rsvpNeeded.length).toBeGreaterThan(0);
  });

  it("prevents a parent from RSVPing for another child", () => {
    const result = setRsvp(seedState, {
      eventId: "event-tigers-game",
      playerId: "player-avery",
      parentUserId: "user-parent-jordan",
      response: "going",
      now: NOW
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("linked child");
  });

  it("updates RSVP and coach attendance summary counts", () => {
    const result = setRsvp(seedState, {
      eventId: "event-tigers-game",
      playerId: "player-mason",
      parentUserId: "user-parent-jordan",
      response: "maybe",
      now: NOW
    });
    const summaries = getCoachRsvpSummaries(result.state, "user-coach-taylor", NOW);

    expect(result.ok).toBe(true);
    expect(summaries[0]?.maybe).toBe(1);
    expect(summaries[0]?.going).toBe(1);
    expect(summaries[0]?.noResponse).toBe(0);
  });
});

describe("schedule changes and admin health", () => {
  it("creates channel-specific notification records for affected parents", () => {
    const result = applyScheduleChange(seedState, {
      eventId: "event-tigers-game",
      actorUserId: "user-admin",
      actorRole: "admin",
      locationName: "Field 3",
      now: NOW
    });

    expect(result.ok).toBe(true);
    expect(result.state.notifications.filter((notification) => notification.eventId === "event-tigers-game")).toHaveLength(4);
  });

  it("computes launch readiness card counts", () => {
    const cards = computeAdminHealth(seedState, NOW);
    const missingCoaches = cards.find((card) => card.id === "missing-coaches");
    const failedInvites = cards.find((card) => card.id === "failed-invites");

    expect(missingCoaches?.count).toBe(2);
    expect(failedInvites?.count).toBe(1);
  });
});

describe("safe team chat access", () => {
  it("allows an assigned parent to view and post in their team chat", () => {
    const access = getTeamChatAccess(seedState, "user-parent-jordan", "team-tigers");
    const view = getTeamChatView(seedState, "user-parent-jordan", "team-tigers", NOW);

    expect(access.canView).toBe(true);
    expect(access.canPost).toBe(true);
    expect(access.canAnnounce).toBe(false);
    expect(access.canModerate).toBe(false);
    expect(view.pinnedMessage?.kind).toBe("announcement");
    expect(view.upcomingGame?.id).toBe("event-tigers-game");
    expect(view.gameDayMessages).toHaveLength(2);
    expect(view.safetyNote).toContain("No child accounts");
  });

  it("prevents a parent from accessing a team they are not assigned to", () => {
    const access = getTeamChatAccess(seedState, "user-parent-jordan", "team-hawks");

    expect(access.canView).toBe(false);
    expect(access.reason).toContain("private");
    expect(() => getTeamChatView(seedState, "user-parent-jordan", "team-hawks", NOW)).toThrow(/private/);
  });

  it("allows coaches to moderate only their assigned team chats", () => {
    expect(canModerateTeamChat(seedState, "user-coach-taylor", "team-tigers")).toBe(true);
    expect(canModerateTeamChat(seedState, "user-coach-taylor", "team-hawks")).toBe(false);
  });

  it("allows org admins to access and moderate all team chats", () => {
    const tigers = getTeamChatAccess(seedState, "user-admin", "team-tigers");
    const hawks = getTeamChatAccess(seedState, "user-admin", "team-hawks");

    expect(tigers.canView).toBe(true);
    expect(tigers.canModerate).toBe(true);
    expect(hawks.canView).toBe(true);
    expect(hawks.canModerate).toBe(true);
  });
});
