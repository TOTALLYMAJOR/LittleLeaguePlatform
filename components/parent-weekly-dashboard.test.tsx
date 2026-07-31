import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { seedState } from "@/lib/domain";
import { buildFamilyMissionControl } from "@/lib/family-mission-control";
import type { ParentCoachDashboardData } from "@/lib/supabase/dashboard-data";
import type { ParentEventChangeLogReadResult } from "@/lib/supabase/event-change-log-reads";
import type { FamilyReplayData } from "@/lib/supabase/family-replays";
import type { ParentTransportationData } from "@/lib/supabase/transportation";
import { ParentWeeklyDashboard } from "./parent-weekly-dashboard";

function parentDashboardData(): ParentCoachDashboardData {
  const playerIds = new Set(["player-mason"]);
  const teamIds = new Set(["team-tigers"]);
  const eventIds = new Set(seedState.events.filter((event) => teamIds.has(event.teamId)).map((event) => event.id));
  return {
    state: {
      ...seedState,
      users: seedState.users.filter((user) => (
        user.id === "user-parent-jordan" || user.id === "user-coach-taylor"
      )),
      teams: seedState.teams.filter((team) => teamIds.has(team.id)),
      teamMemberships: seedState.teamMemberships.filter((membership) => (
        membership.userId === "user-parent-jordan" && teamIds.has(membership.teamId)
      )),
      players: seedState.players.filter((player) => playerIds.has(player.id)),
      guardianLinks: seedState.guardianLinks.filter((link) => (
        link.parentUserId === "user-parent-jordan" && playerIds.has(link.playerId)
      )),
      events: seedState.events.filter((event) => eventIds.has(event.id)),
      rsvps: seedState.rsvps.filter((rsvp) => playerIds.has(rsvp.playerId) && eventIds.has(rsvp.eventId)),
      announcements: seedState.announcements.filter((announcement) => teamIds.has(announcement.teamId)),
      mediaItems: [],
      notifications: [],
      notificationPreferences: [],
      parentReplays: [],
      registrationRequests: [],
      snackScheduleSlots: seedState.snackScheduleSlots.filter((slot) => teamIds.has(slot.teamId)),
      volunteerSignups: seedState.volunteerSignups.filter((signup) => teamIds.has(signup.teamId)),
      sponsors: [],
      weatherAlerts: [],
      teamChatChannels: [],
      chatMessages: [],
      chatModerationAuditEvents: [],
      auditEvents: [],
      rosterImportReports: []
    },
    parentUserId: "user-parent-jordan",
    coachUserId: "",
    isSupabaseBacked: true,
    accessStatus: "live",
    message: "Current family records loaded."
  };
}

const replayData: FamilyReplayData = {
  ok: true,
  message: "Showing published Replays.",
  replays: [{
    id: "replay-1",
    organizationId: "org-little-league",
    seasonId: "season-spring-2026",
    teamId: "team-tigers",
    teamName: "Tiny Tigers",
    childLabels: ["Mason T."],
    coachName: "Coach Taylor",
    title: "Ready hands, brave throws",
    summary: "Mason kept trying and helped a teammate reset.",
    focusAreas: ["catching", "teamwork"],
    homeActivities: [{
      duration: "2_minutes",
      title: "Sock-ball high five",
      parentGoal: "Make one catch feel like a shared win.",
      steps: ["Roll up a pair of socks.", "Make three gentle tosses."]
    }],
    parentTip: "Praise the brave try, not the perfect catch.",
    parentEducation: "Ready hands help a child feel prepared.",
    teamQuest: "Encourage one teammate.",
    skillCards: ["Hands ready"],
    publishedAt: "2026-04-01T10:00:00.000Z",
    approvedAt: "2026-04-01T09:45:00.000Z",
    media: []
  }]
};

const noEventChanges: ParentEventChangeLogReadResult = {
  ok: true,
  message: "No family-safe event changes are visible.",
  scope: {
    parentUserId: "user-parent-jordan",
    organizationId: "org-little-league",
    seasonId: "season-spring-2026",
    familyContextKey: "team-tigers",
    timeZone: "America/Chicago",
    limit: 20
  },
  changes: []
};

const noTransportationRequests: ParentTransportationData = {
  ok: true,
  message: "No current transportation requests.",
  events: [],
  requests: [],
  responsibilities: []
};

describe("ParentWeeklyDashboard", () => {
  it("maps the visual reference to guardian-scoped schedule, Replay, and family logistics truth", () => {
    const dashboardData = parentDashboardData();
    const view = buildFamilyMissionControl({
      state: dashboardData.state,
      parentUserId: dashboardData.parentUserId,
      handoffs: [],
      accessStatus: dashboardData.accessStatus,
      isSupabaseBacked: dashboardData.isSupabaseBacked,
      message: dashboardData.message,
      now: "2026-04-01T12:00:00.000Z"
    });

    const html = renderToStaticMarkup(
      <ParentWeeklyDashboard
        view={view}
        dashboardData={dashboardData}
        replayData={replayData}
        notificationReceipts={[]}
        notificationLoadOk
        transportationData={noTransportationRequests}
        eventChangeData={noEventChanges}
      />
    );

    expect(html).toContain("Mason&#x27;s week");
    expect(html).toContain("Everyone");
    expect(html).toContain("Tiny Tigers vs Rookie Rockets");
    expect(html).toContain("Next event");
    expect(html).toContain("Required family action");
    expect(html).toContain("Persisted RSVP");
    expect(html).toContain("Sock-ball high five");
    expect(html).toContain("Opening weekend notes");
    expect(html).toContain("Family logistics only");
    expect(html).toContain("does not evaluate athlete performance");
    expect(html).not.toContain("%2Fimages%2Fleaguepilot-baseball-field-overhead.webp");
    expect(html).toContain("data-response=\"going\"");
    expect(html).not.toContain("class=\"is-selected\" data-response=\"going\"");
    expect(html).toContain("Family access");
    expect(html).toContain("revoke access anytime");
    expect(html).toContain("No ride help requested");
    expect(html).toContain("/parent/transportation");
    expect(html).not.toContain("What changed");
    expect(html).not.toContain("Detailed family operations");
    expect(html).not.toContain("Avery P.");
    expect(html).not.toContain("Noah B.");
    expect(html).not.toContain("day streak");
    expect(html).not.toContain("cheers");
  });

  it("keeps unpublished Replay content out of the weekly home empty state", () => {
    const dashboardData = parentDashboardData();
    const view = buildFamilyMissionControl({
      state: dashboardData.state,
      parentUserId: dashboardData.parentUserId,
      handoffs: [],
      accessStatus: dashboardData.accessStatus,
      isSupabaseBacked: dashboardData.isSupabaseBacked,
      message: dashboardData.message,
      now: "2026-04-01T12:00:00.000Z"
    });

    const html = renderToStaticMarkup(
      <ParentWeeklyDashboard
        view={view}
        dashboardData={dashboardData}
        replayData={{ ok: true, message: "No published Replay yet.", replays: [] }}
        notificationReceipts={[]}
        notificationLoadOk
        transportationData={noTransportationRequests}
        eventChangeData={noEventChanges}
      />
    );

    expect(html).toContain("Your first published Replay will appear here");
    expect(html).toContain("Coach drafts and unreviewed family media stay hidden");
    expect(html).not.toContain("Sock-ball high five");
  });

  it("surfaces official schedule changes with one clear next action", () => {
    const dashboardData = parentDashboardData();
    dashboardData.state = {
      ...dashboardData.state,
      events: dashboardData.state.events.map((event) => (
        event.id === "event-tigers-game"
          ? { ...event, scheduleVersion: 2 }
          : event
      )),
      rsvps: [{
        id: "rsvp-stale",
        eventId: "event-tigers-game",
        playerId: "player-mason",
        parentUserId: "user-parent-jordan",
        response: "going",
        respondedAt: "2026-04-01T10:00:00.000Z",
        confirmedScheduleVersion: 1,
        lockVersion: 2,
        createdAt: "2026-04-01T10:00:00.000Z",
        updatedAt: "2026-04-01T10:00:00.000Z"
      }]
    };
    const view = buildFamilyMissionControl({
      state: dashboardData.state,
      parentUserId: dashboardData.parentUserId,
      handoffs: [],
      accessStatus: dashboardData.accessStatus,
      isSupabaseBacked: dashboardData.isSupabaseBacked,
      message: dashboardData.message,
      now: "2026-04-01T12:00:00.000Z"
    });

    const eventChangeData: ParentEventChangeLogReadResult = {
      ...noEventChanges,
      changes: [{
        id: "change-1",
        eventId: "event-tigers-game",
        eventTitle: "Tiny Tigers vs Rookie Rockets",
        teamName: "Tiny Tigers",
        childIds: ["player-mason"],
        childLabels: ["Mason T."],
        changeType: "time_changed",
        actorLabel: "Coach Taylor",
        changedAt: "2026-04-03T12:00:00.000Z",
        canonicalHref: "/parent/schedule?eventId=event-tigers-game",
        diffs: [{ field: "start_time", label: "Start time", previousValue: "6:00 PM", currentValue: "5:30 PM" }]
      }]
    };
    const html = renderToStaticMarkup(
      <ParentWeeklyDashboard
        view={view}
        dashboardData={dashboardData}
        replayData={{ ok: true, message: "No published Replay yet.", replays: [] }}
        notificationReceipts={[]}
        notificationLoadOk
        transportationData={noTransportationRequests}
        eventChangeData={eventChangeData}
      />
    );

    expect(html).toContain("What changed");
    expect(html).toContain("Changes since this page was last successfully loaded on this device.");
    expect(html).toContain("Start time");
    expect(html).toContain("6:00 PM");
    expect(html).toContain("5:30 PM");
    expect(html).toContain("Review RSVP after the schedule change");
  });

  it("shows the mutually accepted ride plan instead of the coordinate link when transportation is assigned", () => {
    const dashboardData = parentDashboardData();
    const view = buildFamilyMissionControl({
      state: dashboardData.state,
      parentUserId: dashboardData.parentUserId,
      handoffs: [],
      transportationResponsibilities: [
        { eventId: "event-tigers-game", playerId: "player-mason", direction: "outbound", state: "assigned", adultLabel: "Jordan P." },
        { eventId: "event-tigers-game", playerId: "player-mason", direction: "return", state: "assigned", adultLabel: "Riley P." }
      ],
      accessStatus: dashboardData.accessStatus,
      isSupabaseBacked: dashboardData.isSupabaseBacked,
      message: dashboardData.message,
      now: "2026-04-01T12:00:00.000Z"
    });

    const html = renderToStaticMarkup(
      <ParentWeeklyDashboard
        view={view}
        dashboardData={dashboardData}
        replayData={{ ok: true, message: "No published Replay yet.", replays: [] }}
        notificationReceipts={[]}
        notificationLoadOk
        transportationData={{
          ...noTransportationRequests,
          responsibilities: [
            { eventId: "event-tigers-game", playerId: "player-mason", direction: "outbound", state: "assigned", adultLabel: "Jordan P." },
            { eventId: "event-tigers-game", playerId: "player-mason", direction: "return", state: "assigned", adultLabel: "Riley P." }
          ]
        }}
        eventChangeData={noEventChanges}
      />
    );

    expect(html).toContain("Outbound: Jordan P.");
    expect(html).toContain("Return: Riley P.");
    expect(html).not.toContain("Ride responsibility is not fully assigned");
  });

  it("shows official receipt evidence as an independent coach-update chip", () => {
    const dashboardData = parentDashboardData();
    const view = buildFamilyMissionControl({
      state: dashboardData.state,
      parentUserId: dashboardData.parentUserId,
      handoffs: [],
      accessStatus: dashboardData.accessStatus,
      isSupabaseBacked: dashboardData.isSupabaseBacked,
      message: dashboardData.message,
      now: "2026-04-01T12:00:00.000Z"
    });

    const html = renderToStaticMarkup(
      <ParentWeeklyDashboard
        view={view}
        dashboardData={dashboardData}
        replayData={{ ok: true, message: "No published Replay yet.", replays: [] }}
        notificationReceipts={[{
          notificationId: "notification-1",
          organizationId: "org-little-league",
          teamId: "team-tigers",
          recipientUserId: "user-parent-jordan",
          title: "Opening weekend notes",
          body: "Opening weekend notes",
          channel: "email",
          notificationType: "team_update",
          notificationStatus: "read",
          providerApprovalStatus: "approved",
          createdAt: "2026-04-01T10:00:00.000Z",
          evidence: {
            attemptStatus: "sent",
            acknowledgedAt: "2026-04-01T11:00:00.000Z"
          }
        }]}
        notificationLoadOk
        transportationData={noTransportationRequests}
        eventChangeData={noEventChanges}
      />
    );

    expect(html).toContain("Acknowledged Apr 1");
    expect(html).not.toContain("No receipt evidence");
  });

  it("renders an honest Saturday summary for every linked child with exact action links", () => {
    const dashboardData = parentDashboardData();
    const mason = dashboardData.state.players[0];
    dashboardData.state = {
      ...dashboardData.state,
      players: [
        ...dashboardData.state.players,
        { ...mason, id: "player-avery", firstName: "Avery", lastInitial: "T", jersey: "12" }
      ],
      guardianLinks: [
        ...dashboardData.state.guardianLinks,
        {
          ...dashboardData.state.guardianLinks[0],
          id: "guardian-avery",
          playerId: "player-avery"
        }
      ]
    };
    const view = buildFamilyMissionControl({
      state: dashboardData.state,
      parentUserId: dashboardData.parentUserId,
      handoffs: [],
      accessStatus: dashboardData.accessStatus,
      isSupabaseBacked: dashboardData.isSupabaseBacked,
      message: dashboardData.message,
      now: "2026-04-01T12:00:00.000Z"
    });

    const html = renderToStaticMarkup(
      <ParentWeeklyDashboard
        view={view}
        dashboardData={dashboardData}
        replayData={{ ok: true, message: "No published Replay yet.", replays: [] }}
        notificationReceipts={[{
          notificationId: "critical-1",
          organizationId: "org-little-league",
          teamId: "team-tigers",
          eventId: "event-tigers-game",
          recipientUserId: "user-parent-jordan",
          title: "Weather update",
          body: "Review the official event update.",
          channel: "email",
          notificationType: "weather_alert",
          notificationStatus: "read",
          providerApprovalStatus: "approved",
          createdAt: "2026-04-03T10:00:00.000Z",
          evidence: { attemptStatus: "sent" }
        }]}
        notificationLoadOk
        transportationData={{
          ...noTransportationRequests,
          requests: [{
            id: "ride-avery",
            eventId: "event-tigers-game",
            playerId: "player-avery",
            childLabel: "Avery T.",
            teamName: "Tiny Tigers",
            eventTitle: "Tiny Tigers vs Rookie Rockets",
            startsAt: "2026-04-04T09:00:00.000Z",
            direction: "outbound",
            state: "open",
            stateLabel: "Needs a driver",
            scheduleVersion: 1,
            currentScheduleVersion: 1,
            requestedByLabel: "Jordan Taylor",
            requestedAt: "2026-04-03T09:00:00.000Z",
            canOffer: false,
            canAccept: false,
            canWithdrawRequest: true,
            canWithdrawAssignment: false,
            explanation: "Waiting for an offer."
          }]
        }}
        eventChangeData={noEventChanges}
      />
    );

    expect(html).toContain("Saturday readiness by child");
    expect(html).toContain("Mason T.");
    expect(html).toContain("Avery T.");
    expect(html).toContain("No ride help requested");
    expect(html).toContain("Ride help was requested and awaits an offer");
    expect(html).toContain("#transportation-request-ride-avery");
    expect(html).toContain("#communication-message-critical-1");
    expect(html).not.toContain("Next event</span>");
  });
});
