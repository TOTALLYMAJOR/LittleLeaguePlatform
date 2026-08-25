import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppStateProvider } from "@/app/providers";
import {
  AdminDashboardClient,
  AdminHealthClient,
  AdminTeamManagementClient,
  AdminThemesClient,
  AccountClient,
  AuthClient,
  CoachDashboardClient,
  CoachRsvpsClient,
  ParentDashboardClient,
  ParentRsvpClient,
  ParentReplayClient,
  RegistrationReviewClient,
  RegistrationClient,
  ScheduleAlertsClient,
  TeamChatClient,
  TeamPortalClient
} from "./feature-panels";
import { seedState } from "@/lib/domain";
import type { DrillVideoLibraryData } from "@/lib/supabase/drill-videos";
import type { ParentCoachDashboardData } from "@/lib/supabase/dashboard-data";

function dashboardAccessState(accessStatus: ParentCoachDashboardData["accessStatus"], message: string): ParentCoachDashboardData {
  return {
    state: { ...seedState, users: [], teams: [], teamMemberships: [], players: [], guardianLinks: [], events: [], rsvps: [] },
    parentUserId: "user-parent-missing",
    coachUserId: "user-coach-missing",
    isSupabaseBacked: false,
    accessStatus,
    message
  };
}

const drillVideoLibraryData: DrillVideoLibraryData = {
  teams: seedState.teams,
  events: seedState.events.filter((event) => event.eventType === "practice"),
  drillVideos: [{
    id: "drill-video-1",
    organizationId: seedState.organization.id,
    provider: "youtube",
    externalVideoId: "dQw4w9WgXcQ",
    canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title: "Approved throwing drill",
    thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    sport: "baseball",
    skillCategory: "throwing",
    ageBand: "6U",
    difficulty: "beginner",
    sourceChannel: "Coach Channel",
    sourceChannelId: "channel-1",
    approvalStatus: "approved",
    madeForKidsStatus: true,
    embeddable: true,
    lastValidatedAt: "2026-07-17T12:00:00.000Z",
    createdAt: "2026-07-17T12:00:00.000Z",
    updatedAt: "2026-07-17T12:00:00.000Z"
  }],
  sources: [{
    id: "source-1",
    organizationId: seedState.organization.id,
    provider: "youtube",
    externalChannelId: "channel-1",
    title: "Coach Channel",
    approvalStatus: "approved",
    reviewedBy: "user-admin",
    reviewedAt: "2026-07-17T12:00:00.000Z",
    createdAt: "2026-07-17T12:00:00.000Z",
    updatedAt: "2026-07-17T12:00:00.000Z"
  }],
  assignments: [{
    id: "assignment-1",
    organizationId: seedState.organization.id,
    drillVideoId: "drill-video-1",
    teamId: "team-tigers",
    assignedByUserId: "user-coach-taylor",
    usageContext: "practice_plan",
    visibleToFamilies: false,
    createdAt: "2026-07-17T12:00:00.000Z"
  }],
  isSupabaseBacked: true,
  providerConfigured: true,
  message: "Showing Supabase-backed approved drill video references for coach planning."
};

describe("TeamChatClient", () => {
  it("renders the safe team chat read surface", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <TeamChatClient />
      </AppStateProvider>
    );

    expect(html).toContain("Team Chat");
    expect(html).toContain("Tiny Tigers Chat");
    expect(html).toContain("Tiger Cub clubhouse");
    expect(html).toContain("Pinned Reminder");
    expect(html).toContain("Coach Note");
    expect(html).toContain("Game-Day Questions");
    expect(html).toContain("Thread rail");
    expect(html).toContain("Team presence");
    expect(html).toContain("Context rail");
    expect(html).toContain("Coach Broadcast Mode");
    expect(html).toContain("Read by");
    expect(html).toContain("Preview only");
    expect(html).toContain("Delivery disconnected");
    expect(html).toContain("Reporting UI");
    expect(html).toContain("Retention jobs");
    expect(html).toContain("Media/message policy screens");
    expect(html).toContain("No child accounts");
  });

  it("renders locked viewer/team controls for role-specific wrappers", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <TeamChatClient
          teamChatData={{
            teams: seedState.teams.filter((team) => team.id === "team-tigers"),
            users: seedState.users.filter((user) => ["user-parent-jordan", "user-coach-taylor"].includes(user.id)),
            teamMemberships: seedState.teamMemberships.filter((membership) => membership.teamId === "team-tigers"),
            events: seedState.events.filter((event) => event.teamId === "team-tigers"),
            channels: seedState.teamChatChannels.filter((channel) => channel.teamId === "team-tigers"),
            messages: seedState.chatMessages.filter((message) => message.teamId === "team-tigers"),
            moderationEvents: seedState.chatModerationAuditEvents.filter((event) => event.teamId === "team-tigers")
          }}
          viewerUserId="user-parent-jordan"
          lockedTeamId="team-tigers"
        />
      </AppStateProvider>
    );

    expect(html).toContain("Tiny Tigers Chat");
    expect(html).toContain("Jordan Taylor");
    expect(html).toContain("disabled");
    expect(html).not.toContain("Happy Hawks");
  });
});

describe("AuthClient", () => {
  it("keeps provider implementation detail out of the signed-out access screen", () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    try {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const html = renderToStaticMarkup(<AuthClient />);

      expect(html).toContain("Sign-in services are not connected in this environment");
      expect(html).toContain("Sign in to your LeaguePilot account");
      expect(html).toContain("Continue with Google");
      expect(html).toContain("Continue with Facebook");
      expect(html).toContain("Private team access still requires league approval");
      expect(html).toContain("Request Team Access");
      expect(html).toContain("auth-page");
      expect(html).toContain("auth-submit");
      expect(html).toContain("auth-support-copy");
      expect(html).not.toContain("Create account");
      expect(html).not.toContain("Coach Taylor");
      expect(html).not.toContain("coach.taylor@example.com");
      expect(html).not.toContain("Supabase");
      expect(html).not.toContain("NEXT_PUBLIC_");
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
    }
  });
});

describe("AccountClient", () => {
  it("shows organization membership separately from team membership", () => {
    const html = renderToStaticMarkup(<AccountClient />);

    expect(html).toContain("Your account and access");
    expect(html).toContain("Organization memberships");
    expect(html).toContain("Team memberships");
    expect(html).not.toContain("Confirm identity, profile, and team membership");
  });
});

describe("AdminHealthClient", () => {
  it("renders tenant readiness data from the admin server surface", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <AdminHealthClient
          tenantReadinessData={{
            source: "supabase",
            message: "Tenant readiness is computed from Supabase rows.",
            tenants: [{
              organizationId: "org-a",
              organizationName: "League A",
              activeSeasonId: "season-a",
              activeSeasonName: "Spring 2026",
              readiness: "ready_to_invite",
              readyToInviteFamilies: true,
              blockingCount: 0,
              attentionCount: 0,
              activeTeamCount: 1,
              rosteredPlayerCount: 12,
              activeCoachTeamCount: 1,
              activeGuardianLinkCount: 8,
              pendingRegistrationCount: 0,
              scheduledEventCount: 4,
              checks: [{
                id: "active-season",
                label: "Active season",
                status: "ready",
                detail: "Spring 2026 is active.",
                actionHref: "/admin/teams",
                actionLabel: "Set season",
                sourceOfTruth: "Organization-scoped setup records.",
                responsibleAuthority: "League administrator.",
                privacyBoundary: "Aggregate setup counts only.",
                explanation: "This rule reports state and does not change records."
              }]
            }]
          }}
        />
      </AppStateProvider>
    );

    expect(html).toContain("Tenant readiness is computed from Supabase rows.");
    expect(html).toContain("League A");
    expect(html).toContain("ready to invite");
    expect(html).toContain("Active season");
    expect(html).toContain("Why this status");
    expect(html).toContain("Aggregate setup counts only.");
  });
});

describe("RegistrationReviewClient", () => {
  it("uses the verified session actor, starts with a blank evidence note, and explains manual one-time issuance", () => {
    const html = renderToStaticMarkup(<RegistrationReviewClient initialData={{
      reviewers: [{ id: "admin-1", displayName: "Admin One", email: "admin@example.com", scopes: ["admin:org-1"] }],
      actions: [],
      registrationRequests: [{
        id: "request-1",
        organizationId: "org-1",
        seasonId: "season-1",
        teamId: "team-1",
        parentName: "Jordan R.",
        parentEmail: "jordan@example.com",
        playerFirstName: "Maya",
        playerLastInitial: "R",
        status: "pending",
        createdAt: "2026-07-24T12:00:00.000Z"
      }]
    }} />);
    expect(html).toContain("You cannot choose another reviewer");
    expect(html).toContain("Approve and issue next step");
    expect(html).toContain("not sent automatically");
    expect(html).not.toContain("Acting reviewer");
    expect(html).not.toContain("Reviewed from the admin registration queue");
  });
});

describe("AdminTeamManagementClient", () => {
  it("guides an empty tenant through season, team, and roster setup", () => {
    const html = renderToStaticMarkup(
      <AdminTeamManagementClient
        data={{
          organizationId: "org-a",
          teams: [],
          players: [],
          coaches: [],
          seasons: [],
          divisions: [],
          message: "No Supabase team setup rows yet."
        }}
      />
    );

    expect(html).toContain("Tenant setup guide");
    expect(html).toContain("Get this organization ready before inviting families.");
    expect(html).toContain("Create an active season first.");
    expect(html).toContain("Create an active team before adding rostered players.");
    expect(html).toContain("Start new season");
    expect(html).toContain("Start new team");
    expect(html).toContain("Start new player");
  });
});

describe("CoachDashboardClient", () => {
  it("renders coach operations, weather, snacks, and volunteers", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <CoachDashboardClient />
      </AppStateProvider>
    );

    expect(html).toContain("Coach announcements");
    expect(html).toContain("Pause coach announcements");
    expect(html).toContain("Game-day radar");
    expect(html).toContain("People");
    expect(html).toContain("Place");
    expect(html).toContain("Plan");
    expect(html).toContain("Action queue");
    expect(html).not.toContain("<img");
    expect(html).toContain("in your queue");
    expect(html).toContain("Your 15-minute sideline check");
    expect(html).toContain("Next event");
    expect(html).toContain("Save reminder draft");
    expect(html).toContain("Each numbered row is one task");
    expect(html).toContain("5 tasks in your queue");
    expect(html).toContain("5 tasks to do");
    expect(html).toContain("Open resolution room");
    expect(html).toContain("More coach context");
    expect(html).toContain("Attendance");
    expect(html).toContain("No reply");
    expect(html).toContain("Nudge missing replies");
    expect(html).toContain("Coach readiness details");
    expect(html).toContain("Weather policy details");
    expect(html).toContain("Family response details");
    expect(html).toContain("Drafts and team help");
    expect(html).toContain("Coach notes");
    expect(html).toContain("Coach setup");
    expect(html).toContain("Team setup checklist");
    expect(html).toContain("Weather and alerts");
    expect(html).toContain("Weather approval queue");
    expect(html).toContain("Weather provider retry logs");
    expect(html).toContain("Weather alert history");
    expect(html).toContain("Sport-specific weather thresholds");
    expect(html).toContain("League-specific weather thresholds");
    expect(html).toContain("Heat thresholds");
    expect(html).toContain("Lightning thresholds");
    expect(html).toContain("Air quality thresholds");
    expect(html).toContain("Rain thresholds");
    expect(html).toContain("Field closure drafts");
    expect(html).toContain("Weather escalation rules");
    expect(html).toContain("Weather safety notes");
    expect(html).toContain("Snacks");
    expect(html).toContain("Volunteers");
    expect(html).toContain("Draft weather alert");
    expect(html).toContain("Claim snack slot");
    expect(html).toContain("Claim volunteer role");
    expect(html).toContain("RSVP reliability tracker");
    expect(html).toContain("Coach weekly update builder");
    expect(html).toContain("Editable weekly message");
    expect(html).toContain("Save weekly update draft");
    expect(html).toContain("pending notification drafts");
    expect(html).toContain("RSVP reminder queue");
    expect(html).toContain("Queue RSVP reminder draft");
    expect(html).toContain("This saves a coach draft only");
    expect(html).toContain("Drafts stay Preview, Edit, Approve, Publish");
    expect(html).not.toMatch(/blame|shame|lazy/i);
  });

  it("blocks private coach actions when no active coach membership exists", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <CoachDashboardClient dashboardData={dashboardAccessState("missing_coach_membership", "No active coach assignment.")} />
      </AppStateProvider>
    );

    expect(html).toContain("No active coach membership is assigned");
    expect(html).toContain("Coach role access checklist");
    expect(html).toContain("active coach team membership");
    expect(html).not.toContain("Draft weather alert");
    expect(html).not.toContain("Claim snack slot");
    expect(html).not.toContain("Claim volunteer role");
  });
});

describe("CoachRsvpsClient", () => {
  it("blocks attendance summaries when the signed-in coach lacks an active assignment", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <CoachRsvpsClient dashboardData={dashboardAccessState("missing_coach_membership", "No active coach assignment.")} />
      </AppStateProvider>
    );

    expect(html).toContain("No active coach membership is assigned");
    expect(html).not.toContain("No response:");
  });

  it("renders attendance summaries from scoped dashboard data", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <CoachRsvpsClient dashboardData={{
          state: seedState,
          parentUserId: "",
          coachUserId: "user-coach-taylor",
          isSupabaseBacked: true,
          accessStatus: "live",
          message: "Scoped coach rows."
        }} />
      </AppStateProvider>
    );

    expect(html).toContain("Attendance summaries for assigned teams");
    expect(html).toContain("Tiny Tigers");
    expect(html).toContain("Attendance is current for your assigned teams.");
  });
});

describe("ParentDashboardClient", () => {
  it("renders notification preferences without sending provider updates", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ParentDashboardClient />
      </AppStateProvider>
    );

    expect(html).toContain("Coach announcements");
    expect(html).toContain("Pause coach announcements");
    expect(html).toContain("Season story");
    expect(html).toContain("Family view");
    expect(html).toContain("Schedule and coach updates only. Team media is not shown in this story.");
    expect(html).toContain("Open full game-day plan");
    expect(html).not.toContain("<img");
    expect(html).toContain("Tiny Tigers");
    expect(html).toContain("Tiny Tigers vs Rookie Rockets");
    expect(html).toContain("RSVP needed");
    expect(html).toContain("This week");
    expect(html).toContain("Is Mason going?");
    expect(html).toContain("Choose on the RSVP screen.");
    expect(html).toContain("Arrival timeline");
    expect(html).toContain("Leave by");
    expect(html).toContain("Pack check");
    expect(html).toContain("Uniform");
    expect(html).toContain("Field plan");
    expect(html).toContain("Parking");
    expect(html).toContain("Player readiness");
    expect(html).toContain("Copy game plan");
    expect(html).toContain("Local checklist only. It does not save attendance or send alerts.");
    expect(html).toContain("More event context");
    expect(html).toContain("What you need to do");
    expect(html).toContain("Coach added");
    expect(html).toContain("From your coach");
    expect(html).toContain("Photos");
    expect(html).toContain("Your family&#x27;s info is private to your team");
    expect(html).toContain("RSVP now");
    expect(html).toContain("Schedule alerts");
    expect(html).toContain("Needs action");
    expect(html).toContain("All pending items");
    expect(html).toContain("Family Balance Summary");
    expect(html).toContain("Family finance evidence");
    expect(html).toContain("never infers");
    expect(html).toContain("Family snapshot");
    expect(html).toContain("Media and privacy");
    expect(html).toContain("Calendar and team media");
    expect(html).toContain("Family logistics");
    expect(html).toContain("Family calendar");
    expect(html).toContain("Family calendar");
    expect(html).toContain("Team media");
    expect(html).toContain("Family-facing moderation queue");
    expect(html).toContain("Media consent controls");
    expect(html).toContain("game");
    expect(html).toContain("practice");
    expect(html).toContain("Arrive");
    expect(html).toContain("Opening Day Album");
    expect(html).toContain("How to tie cleats");
    expect(html).toContain("PUSH");
    expect(html).toContain("EMAIL");
    expect(html).toContain("SMS");
    expect(html).toContain("Messages still require opt-in");
    expect(html).toContain("Snack openings");
    expect(html).toContain("Volunteer openings");
    expect(html).toContain("One-Tap Volunteer Marketplace");
    expect(html).toContain("Team help board");
    expect(html).toContain("Equipment Exchange");
    expect(html).toContain("Moderated gear board");
    expect(html).toContain("Family Availability Intelligence");
    expect(html).toContain("never ranks");
    expect(html).toContain("Claim snack slot");
    expect(html).toContain("Claim volunteer role");
    expect(html).toContain("Ask for help");
    expect(html).toContain("Submit support request");
    expect(html).toContain("staff-review support record");
    expect(html).toContain("Report media");
    expect(html).toContain("Google Photos link looks valid");
    expect(html).not.toContain("Drafts to Review");
    expect(html).not.toContain("Request AI rewrite");
    expect(html).not.toContain("Open messages");
  });

  it("renders explicit parent access states on the home screen", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ParentDashboardClient dashboardData={dashboardAccessState("missing_parent_link", "No active guardian link.")} />
      </AppStateProvider>
    );

    expect(html).toContain("Family access is not active yet");
    expect(html).toContain("No active guardian link.");
    expect(html).toContain("What stays protected");
    expect(html).not.toContain("RSVP now");
  });
});

describe("ParentRsvpClient", () => {
  it("blocks RSVP controls for signed-out users", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ParentRsvpClient dashboardData={dashboardAccessState("signed_out", "Sign in with a linked parent account.")} />
      </AppStateProvider>
    );

    expect(html).toContain("Sign in to see family records");
    expect(html).toContain("Open sign in");
    expect(html).not.toContain("Going</button>");
    expect(html).not.toContain("Not going</button>");
  });

  it("renders the shared three-answer grammar and RSVP history for linked parents", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ParentRsvpClient />
      </AppStateProvider>
    );

    expect(html).toContain("RSVP history");
    expect(html).toContain("Going");
    expect(html).toContain("Maybe");
    expect(html).toContain("Can’t go");
    expect(html).not.toContain("Cancel RSVP");
    expect(html).toContain("family-rsvp-control");
  });

  it("keeps archived RSVP records visible but edit controls read-only", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ParentRsvpClient dashboardData={{
          state: {
            ...seedState,
            activeSeason: { ...seedState.activeSeason, status: "archived", archivedAt: "2026-06-16T00:00:00.000Z" }
          },
          parentUserId: "user-parent-jordan",
          coachUserId: "user-coach-taylor",
          isSupabaseBacked: false,
          accessStatus: "live",
          message: "Archived season proof data."
        }} />
      </AppStateProvider>
    );

    expect(html).toContain("Archived RSVP read-only mode");
    expect(html).toContain("Past attendance remains visible");
    expect(html).toContain("data-response=\"going\"");
    expect(html).toContain("disabled");
  });
});

describe("ScheduleAlertsClient", () => {
  it("renders the parent schedule as grouped event cards with the real RSVP entry point", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ScheduleAlertsClient mode="parent" />
      </AppStateProvider>
    );

    expect(html).toContain("Family schedule");
    expect(html).toContain("No events today");
    expect(html).toContain("This week");
    expect(html).toContain("Week ribbon");
    expect(html).toContain("Tiny Tigers vs Rookie Rockets");
    expect(html).toContain("Mason T.");
    expect(html).toContain("family-rsvp-control");
    expect(html).toContain("Open needs reply");
    expect(html).toContain("Event Passport");
    expect(html).toContain("Family filter");
    expect(html).toContain("Family-only RSVP details");
    expect(html).not.toContain("Watch now");
  });

  it("renders the coach calendar as a sideline timeline and readiness matrix", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ScheduleAlertsClient mode="coach" />
      </AppStateProvider>
    );

    expect(html).toContain("Coach schedule");
    expect(html).toContain("Now, next, later");
    expect(html).toContain("Readiness matrix");
    expect(html).toContain("What needs attention before arrival");
    expect(html).toContain("No response");
    expect(html).toContain("Help gaps");
    expect(html).toContain("Weather");
    expect(html).toContain("Save schedule change (drafts family alerts for review)");
  });

  it("renders the admin calendar with a selected-event inspector and change lens", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ScheduleAlertsClient mode="admin" />
      </AppStateProvider>
    );

    expect(html).toContain("League schedule control room");
    expect(html).toContain("Selected event");
    expect(html).toContain("Change lens");
    expect(html).toContain("Original and proposed truth");
    expect(html).toContain("Original");
    expect(html).toContain("Proposed");
    expect(html).toContain("Proposed start");
    expect(html).toContain("Go to schedule change form");
    expect(html).toContain("does not execute provider delivery");
  });

  it("renders an agenda-first public schedule with provider calendar actions", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ScheduleAlertsClient mode="readonly" />
      </AppStateProvider>
    );

    expect(html).toContain("Public schedule");
    expect(html).toContain("League events");
    expect(html).toContain("Tiny Tigers vs Rookie Rockets");
    expect(html).toContain("Arrival");
    expect(html).toContain("Not published");
    expect(html).toContain("Opponent");
    expect(html).toContain("Venue");
    expect(html).toContain("Field");
    expect(html).toContain("Apple Calendar");
    expect(html).toContain("Google Calendar");
    expect(html).toContain("Outlook");
    expect(html).toContain("Download calendar");
    expect(html).not.toContain("ICS preview");
    expect(html).not.toContain("BEGIN:VCALENDAR");
  });

  it("renders schedule change impact preview before queueing alerts", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ScheduleAlertsClient />
      </AppStateProvider>
    );

    expect(html).toContain("Impact preview");
    expect(html).toContain("Event detail");
    expect(html).toContain("Schedule CRUD service");
    expect(html).toContain("Create, update, cancel");
    expect(html).toContain("Conflict detection");
    expect(html).toContain("Schedule conflicts");
    expect(html).toContain("Venue records");
    expect(html).toContain("Known locations");
    expect(html).toContain("Recurring events");
    expect(html).toContain("Weekly preview");
    expect(html).toContain("Calendar export");
    expect(html).toContain("ICS feed preview");
    expect(html).toContain("RSVP sync");
    expect(html).toContain("Schedule attendance counts");
    expect(html).toContain("Schedule notification workflow");
    expect(html).toContain("Review before delivery");
    expect(html).toContain("Event status tracking");
    expect(html).toContain("Push notification channel");
    expect(html).toContain("Email notification channel");
    expect(html).toContain("SMS notification channel");
    expect(html).toContain("sent");
    expect(html).toContain("failed");
    expect(html).toContain("read");
    expect(html).toContain("VAPID send adapter");
    expect(html).toContain("Unsubscribe flow");
    expect(html).toContain("Retry logs");
    expect(html).toContain("Recipient preference enforcement");
    expect(html).toContain("Device management");
    expect(html).toContain("Email fallback");
    expect(html).toContain("SMS urgency rules");
    expect(html).toContain("Alert open rate tracking");
    expect(html).toContain("Affected families");
    expect(html).toContain("Already RSVP");
    expect(html).toContain("Preview only");
  });
});

describe("AdminDashboardClient", () => {
  it("ends the admin home at linked review queues without focused workbenches", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <AdminDashboardClient drillVideoData={drillVideoLibraryData} />
      </AppStateProvider>
    );

    expect(html).toContain("What is blocking launch?");
    expect(html).toContain("Launch blockers need administrator action.");
    expect(html).toContain("Current admin context");
    expect(html).toContain("League admin");
    expect(html).toContain("Teams needing help");
    expect(html).toContain('href="/admin/teams"');
    expect(html).toContain('href="/admin/registrations"');
    expect(html).toContain('href="/admin/message-delivery-review"');
    expect(html).toContain("Pending reviews");
    expect(html).toContain("Fix next hold:");
    expect(html).toContain("Why this is next");
    expect(html).toContain("Fix family access");
    expect(html).not.toContain("Message Delivery Review");
    expect(html).toContain("Suggested review");
    expect(html).toContain("Go to registration review queue");
    expect(html).not.toContain("Team status");
    expect(html).not.toContain("Media governance");
    expect(html).not.toContain("Sponsor management");
    expect(html).not.toContain("Message draft review");
    expect(html).not.toContain("Roster maker readiness");
    expect(html).not.toContain("Queued message records");
    expect(html).not.toContain("Provider sends live");
  });

  it("renders media review as a focused admin route", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <AdminDashboardClient drillVideoData={drillVideoLibraryData} surface="media" />
      </AppStateProvider>
    );

    expect(html).toContain("Review reported media and visibility before families see it.");
    expect(html).toContain("Media governance");
    expect(html).toContain("Coach drill videos");
    expect(html).toContain("Reference review");
    expect(html).toContain("All clear. No media items need review.");
    expect(html).not.toContain("Roster maker readiness");
    expect(html).not.toContain("Sponsor management");
  });

  it("renders sponsors as a focused admin route", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <AdminDashboardClient surface="sponsors" />
      </AppStateProvider>
    );

    expect(html).toContain("Manage sponsor records without exposing billing state to families.");
    expect(html).toContain("Community proof");
    expect(html).toContain("Sponsor evidence ledger");
    expect(html).toContain("Community evidence receipt");
    expect(html).toContain("Player data");
    expect(html).toContain("Not included");
    expect(html).toContain("does not prove payment");
    expect(html).toContain("Open sponsor record");
    expect(html).not.toContain("<img");
    expect(html).toContain("Sponsor management");
    expect(html).toContain("Sponsor billing records");
    expect(html).toContain("League Revenue Dashboard");
    expect(html).toContain("Community Sponsor Matchmaker");
    expect(html).not.toContain("Roster maker readiness");
    expect(html).not.toContain("Media governance");
  });

  it("fails closed instead of restoring seed sponsors when scoped sponsor reads are unavailable", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <AdminDashboardClient
          surface="sponsors"
          sponsorData={{
            organizationId: seedState.organization.id,
            teams: [],
            sponsors: [],
            billingRecords: [],
            programSummaries: [],
            programMessage: "Sponsor agreement, invoice, and delivery records were not loaded. No payment or delivery state is claimed.",
            isSupabaseBacked: false,
            message: "Sponsor records are unavailable for this organization."
          }}
        />
      </AppStateProvider>
    );

    expect(html).toContain("Sponsor records are unavailable for this organization.");
    expect(html).not.toContain(seedState.sponsors[0]!.name);
    expect(html).toContain("<button disabled=\"\">Save sponsor</button>");
  });
});

describe("AdminThemesClient", () => {
  it("renders the first-class admin theme console with contrast and audit context", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <AdminThemesClient
          initialData={{
            teams: seedState.teams,
            users: seedState.users,
            teamMemberships: seedState.teamMemberships,
            tenantDefaults: {
              organizationId: seedState.organization.id,
              themeKey: "baseball",
              mascot: "Tigers",
              primaryColor: "#174ea6",
              secondaryColor: "#fbbc04",
              logoStatus: "not_configured"
            },
            audits: [],
            logoAssets: []
          }}
        />
      </AppStateProvider>
    );

    expect(html).toContain("Admin customization workbench");
    expect(html).toContain("Admin theme console");
    expect(html).toContain("Customization modules");
    expect(html).toContain("First-class team branding control");
    expect(html).toContain("Identity and colors");
    expect(html).toContain("Future team defaults");
    expect(html).toContain("Logo assets");
    expect(html).toContain("Tenant environment studio");
    expect(html).toContain("One control surface for every branded tenant touchpoint.");
    expect(html).toContain("App shell");
    expect(html).toContain("Menus and labels");
    expect(html).toContain("Team portals");
    expect(html).toContain("Mobile view");
    expect(html).toContain("Messages");
    expect(html).toContain("Provider-gated");
    expect(html).toContain("Sponsor docs");
    expect(html).toContain("Sponsor invoice references");
    expect(html).toContain("Safety rules");
    expect(html).toContain("Human review");
    expect(html).toContain("surfaces mapped");
    expect(html).toContain("Game Day");
    expect(html).toContain("Theme editor");
    expect(html).toContain("Customization editor");
    expect(html).toContain("Element visibility");
    expect(html).toContain("Mascot mark");
    expect(html).toContain("Mobile header");
    expect(html).toContain("Game Day band");
    expect(html).toContain("All team themes");
    expect(html).toContain("Theme audit");
    expect(html).toContain("Save as tenant defaults");
    expect(html).toContain("Tenant defaults");
    expect(html).toContain("Logo:");
    expect(html).toContain("Logo asset review");
    expect(html).toContain("Queue logo metadata for customization");
    expect(html).toContain("HTTPS logo URL");
    expect(html).toContain("Upload mascot artwork for preview");
    expect(html).toContain("Local preview only");
    expect(html).toContain("Queue logo review");
    expect(html).toContain("Sponsor logos stay in sponsor records");
    expect(html).toContain("No logo assets queued yet");
    expect(html).toContain("Binary upload, public rendering, and email/push logo use still require provider configuration");
    expect(html).toContain("Theme QA");
    expect(html).toContain("Dark:");
    expect(html).toContain("Mobile:");
    expect(html).toContain("Launch validation");
    expect(html).toContain("20 target brand surfaces");
    expect(html).toContain("100% covered");
    expect(html).toContain("Team logo");
    expect(html).toContain("Team banner / hero image");
    expect(html).toContain("RSVP buttons and status badges");
    expect(html).toContain("Invite emails");
    expect(html).toContain("Push notification team identity");
    expect(html).toContain("Test brands and metrics");
    expect(html).toContain("Branding appears on all 20 target features");
    expect(html).toContain("Production monitoring");
    expect(html).toContain("brand_profile_published");
    expect(html).toContain("brand_asset_rejected");
    expect(html).toContain("brand_render_failed");
    expect(html).toContain("Published brand missing required tokens");
    expect(html).toContain("Coach feedback and acceptance");
    expect(html).toContain("Did the preview match what parents actually saw?");
    expect(html).toContain("A coach can configure one team brand profile.");
  });
});

describe("RegistrationClient", () => {
  it("renders an empty access request with a family-readable review timeline", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <RegistrationClient />
      </AppStateProvider>
    );

    expect(html).toContain("Request Team Access");
    expect(html).toContain("What happens next");
    expect(html).toContain("The league checks the match");
    expect(html).toContain("Privacy promise");
    expect(html).toContain("Your request receipt");
    expect(html).toContain("Choose a team");
    expect(html).not.toContain("Pending requests");
    expect(html).not.toContain("Demo Pending Parent");
    expect(html).not.toContain("Casey Morgan");
    expect(html).not.toContain("casey@example.com");
    expect(html).not.toContain("invite token");
    expect(html).not.toContain("access grant");
  });

  it("renders server-backed team options without falling back to seed ids", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <RegistrationClient
          registrationRequests={[]}
          teamOptions={[{ id: "supabase-team-uuid", name: "Launch Lions", division: "6U" }]}
        />
      </AppStateProvider>
    );

    expect(html).toContain("Launch Lions (6U)");
    expect(html).not.toContain("Tiny Tigers (6U)");
  });

  it("renders passive public configuration proof attributes without raw organization values", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <RegistrationClient
          proofMetadata={{
            publicOrganizationFingerprint: "5c5a4f34f1d20464",
            reviewWindowConfigured: true
          }}
          reviewWindow="within three business days"
        />
      </AppStateProvider>
    );

    expect(html).toContain('data-public-organization-fingerprint="5c5a4f34f1d20464"');
    expect(html).toContain('data-access-review-window-configured="true"');
    expect(html).toContain("The usual review target is within three business days.");
    expect(html).not.toContain("11111111-1111-4111-8111-111111111111");
  });
});

describe("ParentReplayClient", () => {
  it("renders the coach recap builder and generated parent replay preview", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ParentReplayClient />
      </AppStateProvider>
    );

    expect(html).toContain("Parent Replay");
    expect(html).toContain("Rookie Coach Assist");
    expect(html).toContain("Age-safe practice help for new volunteer coaches");
    expect(html).toContain("Local preview only");
    expect(html).toContain("Coach experience");
    expect(html).toContain("Motivation strategy");
    expect(html).toContain("Team energy");
    expect(html).toContain("Chaos Button");
    expect(html).toContain("Give me a 90-second reset");
    expect(html).toContain("Press the button to reveal coach-reviewed reset copy");
    expect(html).toContain("Practice plan");
    expect(html).toContain("Coach objective");
    expect(html).toContain("Practice Personality Engine");
    expect(html).toContain("Coach Voice Coach");
    expect(html).toContain("Stop messing around");
    expect(html).toContain("Do-say phrases");
    expect(html).toContain("Avoid-saying phrases");
    expect(html).toContain("Parent Replay seed");
    expect(html).toContain("Parent message draft");
    expect(html).toContain("Parent Reinforcement Loop");
    expect(html).toContain("Praise the brave try, not the result");
    expect(html).toContain("Source evidence");
    expect(html).toContain("Use seed in Parent Replay");
    expect(html).toContain("Today we worked on");
    expect(html).toContain("Two-minute home activity");
    expect(html).toContain("Coach video");
    expect(html).toContain("Parent tip");
    expect(html).toContain("Team quest");
    expect(html).toContain("Prompt/Eval harness");
    expect(html).toContain("Translation engine");
    expect(html).toContain("Healthy streak");
    expect(html).toContain("Memory timeline");
    expect(html).toContain("AI Coach Workspace");
    expect(html).toContain("Generate Parent Brief");
    expect(html).toContain("Team Onboarding Brief");
    expect(html).toContain("New coach and participant brief");
    expect(html).toContain("Create Weekly Digest");
    expect(html).toContain("Practice Replay");
    expect(html).toContain("Draft Announcement");
    expect(html).toContain("Build FAQ");
    expect(html).toContain("Prioritize Coach Inbox");
    expect(html).toContain("Parent Brief Before Game");
    expect(html).toContain("Season Timeline");
    expect(html).toContain("Coach Knowledge Base");
    expect(html).toContain("Extract Action Items");
    expect(html).toContain("Safety Monitor");
    expect(html).toContain("Season Storybook");
    expect(html).toContain("Preview - Edit - Approve - Publish");
  });

  it("renders coach-only drill video submission, assignment, and privacy-enhanced embeds", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ParentReplayClient drillVideoData={drillVideoLibraryData} />
      </AppStateProvider>
    );

    expect(html).toContain("Submit a YouTube drill reference");
    expect(html).toContain("Submit for admin review");
    expect(html).toContain("Approved club library");
    expect(html).toContain("Assign to practice planning");
    expect(html).toContain("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(html).toContain("family visible no");
  });

  it("uses signed-in Supabase coach scope for Parent Replay and AI workspace requests", () => {
    const supabaseTeamId = "33333333-3333-4333-8333-333333333331";
    const supabaseCoachId = "coach-live-user";
    const dashboardData: ParentCoachDashboardData = {
      state: {
        ...seedState,
        users: [{ id: supabaseCoachId, role: "coach", name: "Coach Live", email: "coach@example.com" }],
        teams: [{ ...seedState.teams[0]!, id: supabaseTeamId, name: "Supabase Tigers", coachUserId: supabaseCoachId }],
        teamMemberships: [{
          id: "membership-live-coach",
          teamId: supabaseTeamId,
          userId: supabaseCoachId,
          role: "coach",
          status: "active"
        }],
        players: seedState.players.map((player) => ({ ...player, teamId: supabaseTeamId })),
        events: seedState.events.map((event) => ({ ...event, teamId: supabaseTeamId })),
        announcements: seedState.announcements.map((announcement) => ({ ...announcement, teamId: supabaseTeamId, authorUserId: supabaseCoachId })),
        mediaItems: seedState.mediaItems.map((item) => ({ ...item, teamId: supabaseTeamId })),
        snackScheduleSlots: seedState.snackScheduleSlots.map((slot) => ({ ...slot, teamId: supabaseTeamId })),
        volunteerSignups: seedState.volunteerSignups.map((signup) => ({ ...signup, teamId: supabaseTeamId }))
      },
      parentUserId: "",
      coachUserId: supabaseCoachId,
      isSupabaseBacked: true,
      accessStatus: "live",
      message: "Showing Supabase team membership, roster, RSVP, weather, snack, and volunteer rows."
    };

    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ParentReplayClient dashboardData={dashboardData} />
      </AppStateProvider>
    );

    expect(html).toContain("Team and coach access are current for this replay");
    expect(html).toContain("Supabase Tigers");
    expect(html).toContain(supabaseTeamId);
    expect(html).toContain("Request AI rewrite");
  });

  it("blocks Parent Replay AI workspace when the signed-in user lacks coach access", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ParentReplayClient dashboardData={dashboardAccessState("missing_coach_membership", "No active coach assignment.")} />
      </AppStateProvider>
    );

    expect(html).toContain("No active coach membership is assigned");
    expect(html).toContain("Coach role access checklist");
    expect(html).not.toContain("Request AI rewrite");
  });
});

describe("TeamPortalClient", () => {
  it("renders the requested tier features in a team-scoped portal", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <TeamPortalClient />
      </AppStateProvider>
    );

    expect(html).toContain("Team-specific portal");
    expect(html).toContain("Portal colors and mascot");
    expect(html).toContain("Tiger Cub colors");
    expect(html).toContain("Weekly digest");
    expect(html).toContain("Game Day Mode");
    expect(html).toContain("Calm Mode keeps only essentials visible");
    expect(html).toContain("RSVP:");
    expect(html).toContain("Embedded map UI");
    expect(html).toContain("Venue marker management");
    expect(html).toContain("Quota handling");
    expect(html).toContain("Field layout metadata");
    expect(html).toContain("Venue pages");
    expect(html).toContain("Parking notes");
    expect(html).toContain("Field entrance notes");
    expect(html).toContain("Restroom info");
    expect(html).toContain("Arrival instructions");
    expect(html).toContain("Venue intelligence layer");
    expect(html).toContain("Map fallback UX");
    expect(html).toContain("Location change highlighting");
    expect(html).toContain("Facility notes");
    expect(html).toContain("Per-player media consent");
    expect(html).toContain("Private team album");
    expect(html).toContain("Parent-submitted moments");
    expect(html).toContain("Volunteer moments");
    expect(html).toContain("Exportable season memories");
    expect(html).toContain("Snack reminders");
    expect(html).toContain("Snack conflict handling");
    expect(html).toContain("Snack audit trail");
    expect(html).toContain("Snack cancellations");
    expect(html).toContain("Volunteer role caps");
    expect(html).toContain("Volunteer reminders");
    expect(html).toContain("Volunteer cancellation flow");
    expect(html).toContain("Volunteer approval policies");
    expect(html).toContain("Snack and volunteer fairness engine");
    expect(html).toContain("Duty rotation");
    expect(html).toContain("Family opt-outs");
    expect(html).toContain("Sibling-aware duty assignment");
    expect(html).toContain("Missed-slot tracking");
    expect(html).toContain("Coach video library");
    expect(html).toContain("Team Portal sponsor placement");
    expect(html).toContain("Local Business Team Pages");
    expect(html).toContain("community sponsors");
    expect(html).toContain("do not expose child profiles");
    expect(html).toContain("One-Tap Volunteer Marketplace");
    expect(html).toContain("Snack, score, field, carpool, and backup jobs");
    expect(html).toContain("Equipment Exchange");
    expect(html).toContain("Weather + Safety Decision Assistant");
    expect(html).toContain("Sponsor-Safe Media Gallery");
    expect(html).toContain("Approved recap pages");
    expect(html).toContain("Family Availability Intelligence");
    expect(html).toContain("Parent education center");
    expect(html).toContain("Skill trees");
    expect(html).toContain("Season storybook");
    expect(html).toContain("Volunteer center");
    expect(html).toContain("AI learning plans");
  });
});
