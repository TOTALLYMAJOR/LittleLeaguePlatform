import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppStateProvider } from "@/app/providers";
import {
  AdminDashboardClient,
  AdminThemesClient,
  CoachDashboardClient,
  ParentDashboardClient,
  ParentRsvpClient,
  ParentReplayClient,
  RegistrationClient,
  ScheduleAlertsClient,
  TeamChatClient,
  TeamPortalClient
} from "./feature-panels";
import { seedState } from "@/lib/domain";
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
    expect(html).toContain("Seed fallback");
    expect(html).toContain("Provider disconnected");
    expect(html).toContain("Reporting UI");
    expect(html).toContain("Retention jobs");
    expect(html).toContain("Media/message policy screens");
    expect(html).toContain("No child accounts");
  });
});

describe("CoachDashboardClient", () => {
  it("renders coach operations, weather, snacks, and volunteers", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <CoachDashboardClient />
      </AppStateProvider>
    );

    expect(html).toContain("Coach Home");
    expect(html).toContain("Next event readiness");
    expect(html).toContain("No response");
    expect(html).toContain("Needs review");
    expect(html).toContain("Review RSVPs");
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
    expect(html).toContain("Provider sending remains approval-gated");
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

describe("ParentDashboardClient", () => {
  it("renders notification preferences without sending provider updates", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ParentDashboardClient />
      </AppStateProvider>
    );

    expect(html).toContain("Tiny Tigers");
    expect(html).toContain("3U");
    expect(html).toContain("Tiny Tigers vs Rookie Rockets");
    expect(html).toContain("What you need to do");
    expect(html).toContain("What changed");
    expect(html).toContain("From your coach");
    expect(html).toContain("Weather draft");
    expect(html).toContain("Messages");
    expect(html).toContain("Photos");
    expect(html).toContain("Your family&#x27;s info is private to your team");
    expect(html).toContain("RSVP now");
    expect(html).toContain("Schedule alerts");
    expect(html).toContain("All pending items");
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
    expect(html).toContain("Provider sends still require opt-in");
    expect(html).toContain("Snack openings");
    expect(html).toContain("Volunteer openings");
    expect(html).toContain("Claim snack slot");
    expect(html).toContain("Claim volunteer role");
    expect(html).toContain("Ask for help");
    expect(html).toContain("Submit support request");
    expect(html).toContain("staff-review support record");
    expect(html).toContain("Report media");
    expect(html).toContain("Google Photos link looks valid");
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

  it("renders RSVP history, edit buttons, and cancellation controls for linked parents", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ParentRsvpClient />
      </AppStateProvider>
    );

    expect(html).toContain("RSVP history");
    expect(html).toContain("Going");
    expect(html).toContain("Maybe");
    expect(html).toContain("Cancel RSVP");
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
    expect(html).toContain("Going</button>");
  });
});

describe("ScheduleAlertsClient", () => {
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
  it("renders admin operations, registrations, sponsors, and notifications", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <AdminDashboardClient />
      </AppStateProvider>
    );

    expect(html).toContain("Admin Home");
    expect(html).toContain("League health for this week");
    expect(html).toContain("Teams needing help");
    expect(html).toContain("Pending reviews");
    expect(html).toContain("Suggested reviews");
    expect(html).toContain("Registration queue");
    expect(html).toContain("Media governance");
    expect(html).toContain("Media reports");
    expect(html).toContain("Upload storage");
    expect(html).toContain("Approve media");
    expect(html).toContain("Reject media");
    expect(html).toContain("Role-based media visibility");
    expect(html).toContain("Media retention policy");
    expect(html).toContain("Photo visibility flags");
    expect(html).toContain("Takedown request");
    expect(html).toContain("Team/org visibility");
    expect(html).toContain("Hide media");
    expect(html).toContain("Restore media");
    expect(html).toContain("Sponsor management");
    expect(html).toContain("Sponsor placement");
    expect(html).toContain("Public display policy");
    expect(html).toContain("Sponsor billing records");
    expect(html).toContain("Stripe Product/Price");
    expect(html).toContain("invoice reference");
    expect(html).toContain("payment status");
    expect(html).toContain("Sponsor billing stays separate from child-facing display");
    expect(html).toContain("Schedule sponsor placement");
    expect(html).toContain("media gallery sponsor placement");
    expect(html).toContain("email sponsor placement");
    expect(html).toContain("banner sponsor placement");
    expect(html).toContain("Save sponsor");
    expect(html).toContain("Message draft review");
    expect(html).toContain("SMS draft");
    expect(html).toContain("Drag and drop SVG lineup");
    expect(html).toContain("Roster maker readiness");
    expect(html).toContain("Automatic team builder preview");
    expect(html).toContain("Sibling/friend constraints");
    expect(html).toContain("skill-balance score");
    expect(html).toContain("Preview -&gt; Edit -&gt; Approve -&gt; Publish");
    expect(html).toContain("Bracket maker");
    expect(html).toContain("Queued message records");
    expect(html).toContain("Touch target check");
    expect(html).toContain("Offline label");
    expect(html).toContain("Contrast checks");
    expect(html).toContain("Privacy filters");
    expect(html).toContain("Engagement and delivery-rate metrics stay out of this home card");
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
    expect(html).toContain("Theme editor");
    expect(html).toContain("Customization editor");
    expect(html).toContain("All team themes");
    expect(html).toContain("Theme audit");
    expect(html).toContain("Save as tenant defaults");
    expect(html).toContain("Tenant defaults");
    expect(html).toContain("Logo:");
    expect(html).toContain("Logo asset review");
    expect(html).toContain("Queue logo metadata for customization");
    expect(html).toContain("HTTPS logo URL");
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
  it("renders self-registration with admin review boundary", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <RegistrationClient />
      </AppStateProvider>
    );

    expect(html).toContain("Registration system");
    expect(html).toContain("Submit for review");
    expect(html).toContain("does not create a login");
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

    expect(html).toContain("Showing Supabase team membership");
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
    expect(html).toContain("Parent education center");
    expect(html).toContain("Skill trees");
    expect(html).toContain("Season storybook");
    expect(html).toContain("Volunteer center");
    expect(html).toContain("AI learning plans");
  });
});
