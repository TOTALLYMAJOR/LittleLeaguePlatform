import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { seedState } from "@/lib/domain";
import { buildFamilyMissionControl } from "@/lib/family-mission-control";
import type { ParentCoachDashboardData } from "@/lib/supabase/dashboard-data";
import type { FamilyReplayData } from "@/lib/supabase/family-replays";
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
      />
    );

    expect(html).toContain("Mason&#x27;s week");
    expect(html).toContain("Tiny Tigers vs Rookie Rockets");
    expect(html).toContain("Will Mason T. be there?");
    expect(html).toContain("Sock-ball high five");
    expect(html).toContain("Opening weekend notes");
    expect(html).toContain("Ready for Saturday");
    expect(html).toContain("things need you");
    expect(html).toContain("Ride plan not set");
    expect(html).toContain("Open rides");
    expect(html).toContain("%2Fimages%2Fleaguepilot-baseball-field-overhead.webp");
    expect(html).toContain("data-response=\"going\"");
    expect(html).toContain("Family access");
    expect(html).toContain("revoke access anytime");
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
      ))
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
      />
    );

    expect(html).toContain("What changed");
    expect(html).toContain("Official schedule version changed");
    expect(html).toContain("schedule version 2");
    expect(html).toContain("Schedule change needs review");
    expect(html).toContain("RSVP");
    expect(html).toContain("parent-weekly-changes-action");
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
      />
    );

    expect(html).toContain("Outbound: Jordan P.");
    expect(html).toContain("Return: Riley P.");
    expect(html).not.toContain("Ride plan not set");
  });

  it("renders a clear Saturday state when RSVP and ride evidence are resolved", () => {
    const dashboardData = parentDashboardData();
    dashboardData.state = {
      ...dashboardData.state,
      rsvps: [{
        id: "rsvp-mason-game",
        eventId: "event-tigers-game",
        playerId: "player-mason",
        parentUserId: "user-parent-jordan",
        response: "going",
        respondedAt: "2026-04-01T09:30:00.000Z",
        confirmedScheduleVersion: 1,
        lockVersion: 1,
        createdAt: "2026-04-01T09:30:00.000Z",
        updatedAt: "2026-04-01T09:30:00.000Z"
      }]
    };
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
      />
    );

    expect(html).toContain("Nothing unresolved for Saturday");
    expect(html).toContain("RSVP, ride, changes, and family assignments");
  });
});
