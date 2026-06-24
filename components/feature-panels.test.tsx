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

    expect(html).toContain("Coach dashboard");
    expect(html).toContain("Coach assistant");
    expect(html).toContain("Weather and alerts");
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
  });

  it("blocks private coach actions when no active coach membership exists", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <CoachDashboardClient dashboardData={dashboardAccessState("missing_coach_membership", "No active coach assignment.")} />
      </AppStateProvider>
    );

    expect(html).toContain("No active coach membership is assigned");
    expect(html).toContain("What stays protected");
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

    expect(html).toContain("Notification preference center");
    expect(html).toContain("Parent help assistant");
    expect(html).toContain("PUSH");
    expect(html).toContain("EMAIL");
    expect(html).toContain("SMS");
    expect(html).toContain("Provider sends still require opt-in");
    expect(html).toContain("Snack openings");
    expect(html).toContain("Volunteer openings");
    expect(html).toContain("Claim snack slot");
    expect(html).toContain("Claim volunteer role");
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
});

describe("ScheduleAlertsClient", () => {
  it("renders schedule change impact preview before queueing alerts", () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <ScheduleAlertsClient />
      </AppStateProvider>
    );

    expect(html).toContain("Impact preview");
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

    expect(html).toContain("Admin dashboard");
    expect(html).toContain("Admin copilot");
    expect(html).toContain("Registration queue");
    expect(html).toContain("Media governance");
    expect(html).toContain("Team/org visibility");
    expect(html).toContain("Hide media");
    expect(html).toContain("Restore media");
    expect(html).toContain("Sponsor management");
    expect(html).toContain("Sponsor placement");
    expect(html).toContain("Save sponsor");
    expect(html).toContain("Stripe/payment billing is not connected");
    expect(html).toContain("Communication console");
    expect(html).toContain("Mass SMS");
    expect(html).toContain("Drag and drop SVG lineup");
    expect(html).toContain("Roster maker readiness");
    expect(html).toContain("Bracket maker");
    expect(html).toContain("Queued communication records");
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
            audits: []
          }}
        />
      </AppStateProvider>
    );

    expect(html).toContain("Admin theme console");
    expect(html).toContain("First-class team branding control");
    expect(html).toContain("Theme editor");
    expect(html).toContain("All team themes");
    expect(html).toContain("Theme audit");
    expect(html).toContain("Save as tenant defaults");
    expect(html).toContain("Tenant defaults");
    expect(html).toContain("Logo:");
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
    expect(html).toContain("Today we worked on");
    expect(html).toContain("Two-minute home activity");
    expect(html).toContain("Coach video");
    expect(html).toContain("Parent tip");
    expect(html).toContain("Team quest");
    expect(html).toContain("Translation engine");
    expect(html).toContain("Healthy streak");
    expect(html).toContain("Memory timeline");
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
    expect(html).toContain("Coach video library");
    expect(html).toContain("Parent education center");
    expect(html).toContain("Skill trees");
    expect(html).toContain("Season storybook");
    expect(html).toContain("Volunteer center");
    expect(html).toContain("AI learning plans");
  });
});
