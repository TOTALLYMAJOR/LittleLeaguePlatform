import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postRsvp } from "./api/rsvps/route";
import { POST as postAdminExport } from "./api/admin/exports/route";
import { POST as postNotificationPreference } from "./api/notification-preferences/route";
import { POST as postNotificationUnsubscribe } from "./api/notification-preferences/unsubscribe/route";
import { POST as postMobileUsageEvent } from "./api/mobile-usage-events/route";
import { POST as postProviderDeliveryReview } from "./api/provider-delivery/review/route";
import { GET as getProviderDeliveryRetryPlan } from "./api/provider-delivery/retry-plan/route";
import { POST as postParentReplay } from "./api/coach/parent-replay/route";
import { POST as postWeeklyUpdate } from "./api/coach/weekly-update/route";
import { POST as postSponsorSave } from "./api/admin/sponsors/route";
import { POST as postAdminTeam } from "./api/admin/teams/route";
import { POST as postAdminSeason } from "./api/admin/seasons/route";
import { POST as postAdminRoster } from "./api/admin/rosters/route";
import { POST as postScheduleEvent } from "./api/schedule/route";
import { POST as postSupportRequest } from "./api/support-requests/route";
import { POST as postGuardianRepair } from "./api/admin/guardian-links/repair/route";
import { POST as postRosterImportAudit } from "./api/admin/roster-imports/audit/route";
import { POST as postThemeDefaults } from "./api/admin/theme-defaults/route";
import { POST as postMediaReport } from "./api/media/report/route";
import { POST as postMediaModeration } from "./api/media/moderation/route";
import { POST as postSnackClaim } from "./api/snack-slots/claim/route";
import { POST as postVolunteerClaim } from "./api/volunteer-signups/claim/route";
import { POST as postWeatherDraft } from "./api/weather-alerts/draft/route";
import { POST as postTeamMembership } from "./api/admin/team-memberships/route";
import type { ParentReplayDraft } from "@/lib/domain";
import { updateTenantThemeDefaults } from "@/lib/supabase/team-branding";
import { createTeamMembership } from "@/lib/supabase/memberships";
import { recordRosterImportAudit } from "@/lib/supabase/roster-imports";
import { saveAdminSeason, saveAdminTeam, saveRosterPlayer } from "@/lib/supabase/team-management";
import { saveScheduleEvent } from "@/lib/supabase/schedule-management";
import { repairGuardianLink } from "@/lib/supabase/guardian-links";
import { createAdminExport } from "@/lib/supabase/reporting";
import { listProviderDeliveryRetryQueue, reviewNotificationDelivery } from "@/lib/supabase/provider-delivery";
import {
  claimSnackSlot,
  claimVolunteerRole,
  createWeatherAlertDraft,
  saveCoachWeeklyUpdate,
  saveSponsor,
  moderateMediaItem,
  reportMediaItem,
  recordMobileUsageEvent,
  saveParentReplay,
  submitParentSupportRequest,
  updateNotificationPreference,
  updateParentRsvp
} from "@/lib/supabase/operations";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

vi.mock("@/lib/supabase/route-auth", () => ({
  requireAuthenticatedRouteUser: vi.fn()
}));

vi.mock("@/lib/supabase/operations", () => ({
  claimSnackSlot: vi.fn(),
  claimVolunteerRole: vi.fn(),
  createWeatherAlertDraft: vi.fn(),
  saveCoachWeeklyUpdate: vi.fn(),
  saveSponsor: vi.fn(),
  moderateMediaItem: vi.fn(),
  reportMediaItem: vi.fn(),
  recordMobileUsageEvent: vi.fn(),
  saveParentReplay: vi.fn(),
  submitParentSupportRequest: vi.fn(),
  updateNotificationPreference: vi.fn(),
  updateParentRsvp: vi.fn()
}));

vi.mock("@/lib/supabase/team-branding", () => ({
  updateTenantThemeDefaults: vi.fn()
}));

vi.mock("@/lib/supabase/memberships", () => ({
  createTeamMembership: vi.fn()
}));

vi.mock("@/lib/supabase/roster-imports", () => ({
  recordRosterImportAudit: vi.fn()
}));

vi.mock("@/lib/supabase/team-management", () => ({
  saveAdminSeason: vi.fn(),
  saveAdminTeam: vi.fn(),
  saveRosterPlayer: vi.fn()
}));

vi.mock("@/lib/supabase/schedule-management", () => ({
  saveScheduleEvent: vi.fn()
}));

vi.mock("@/lib/supabase/guardian-links", () => ({
  repairGuardianLink: vi.fn()
}));

vi.mock("@/lib/supabase/reporting", () => ({
  createAdminExport: vi.fn()
}));

vi.mock("@/lib/supabase/provider-delivery", () => ({
  listProviderDeliveryRetryQueue: vi.fn(),
  reviewNotificationDelivery: vi.fn()
}));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const updateParentRsvpMock = vi.mocked(updateParentRsvp);
const claimSnackSlotMock = vi.mocked(claimSnackSlot);
const claimVolunteerRoleMock = vi.mocked(claimVolunteerRole);
const createWeatherAlertDraftMock = vi.mocked(createWeatherAlertDraft);
const saveCoachWeeklyUpdateMock = vi.mocked(saveCoachWeeklyUpdate);
const saveSponsorMock = vi.mocked(saveSponsor);
const moderateMediaItemMock = vi.mocked(moderateMediaItem);
const reportMediaItemMock = vi.mocked(reportMediaItem);
const recordMobileUsageEventMock = vi.mocked(recordMobileUsageEvent);
const saveParentReplayMock = vi.mocked(saveParentReplay);
const submitParentSupportRequestMock = vi.mocked(submitParentSupportRequest);
const updateNotificationPreferenceMock = vi.mocked(updateNotificationPreference);
const updateTenantThemeDefaultsMock = vi.mocked(updateTenantThemeDefaults);
const createTeamMembershipMock = vi.mocked(createTeamMembership);
const recordRosterImportAuditMock = vi.mocked(recordRosterImportAudit);
const saveAdminSeasonMock = vi.mocked(saveAdminSeason);
const saveAdminTeamMock = vi.mocked(saveAdminTeam);
const saveRosterPlayerMock = vi.mocked(saveRosterPlayer);
const saveScheduleEventMock = vi.mocked(saveScheduleEvent);
const repairGuardianLinkMock = vi.mocked(repairGuardianLink);
const createAdminExportMock = vi.mocked(createAdminExport);
const listProviderDeliveryRetryQueueMock = vi.mocked(listProviderDeliveryRetryQueue);
const reviewNotificationDeliveryMock = vi.mocked(reviewNotificationDelivery);

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: {
      authorization: "Bearer live-session",
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

describe("live action API routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authMock.mockResolvedValue({ ok: true, user: { id: "user-live-session", email: "parent@example.com" } });
  });

  it("uses the authenticated parent session for RSVP writes", async () => {
    updateParentRsvpMock.mockResolvedValue({ ok: true, message: "RSVP saved.", rsvp: { id: "rsvp-1" } });

    const response = await postRsvp(jsonRequest({
      eventId: "event-1",
      playerId: "player-1",
      response: "going",
      parentUserId: "client-spoof"
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(updateParentRsvpMock).toHaveBeenCalledWith({
      eventId: "event-1",
      playerId: "player-1",
      parentUserId: "user-live-session",
      response: "going",
      note: undefined
    });
  });

  it("uses the authenticated parent session for snack claims", async () => {
    claimSnackSlotMock.mockResolvedValue({ ok: true, message: "Snack saved.", slot: { id: "slot-1" } });

    const response = await postSnackClaim(jsonRequest({ slotId: "slot-1", parentUserId: "client-spoof" }));

    expect(response.status).toBe(200);
    expect(claimSnackSlotMock).toHaveBeenCalledWith({
      slotId: "slot-1",
      parentUserId: "user-live-session"
    });
  });

  it("uses the authenticated parent session for support requests", async () => {
    submitParentSupportRequestMock.mockResolvedValue({
      ok: true,
      message: "Support request saved.",
      supportRequest: { id: "support-1", team_id: "team-1", parent_user_id: "user-live-session", topic: "schedule", status: "open" }
    });

    const response = await postSupportRequest(jsonRequest({
      teamId: "team-1",
      parentUserId: "client-spoof",
      topic: "schedule",
      detail: "Need help with the Saturday game."
    }));

    expect(response.status).toBe(201);
    expect(submitParentSupportRequestMock).toHaveBeenCalledWith({
      parentUserId: "user-live-session",
      teamId: "team-1",
      topic: "schedule",
      detail: "Need help with the Saturday game."
    });
  });

  it("uses the authenticated user session for volunteer claims", async () => {
    claimVolunteerRoleMock.mockResolvedValue({ ok: true, message: "Volunteer saved.", signup: { id: "volunteer-1" } });

    const response = await postVolunteerClaim(jsonRequest({ signupId: "volunteer-1", userId: "client-spoof" }));

    expect(response.status).toBe(200);
    expect(claimVolunteerRoleMock).toHaveBeenCalledWith({
      signupId: "volunteer-1",
      userId: "user-live-session"
    });
  });

  it("uses the authenticated coach session for weather alert drafts", async () => {
    createWeatherAlertDraftMock.mockResolvedValue({ ok: true, message: "Weather saved.", alert: { id: "alert-1" } });

    const response = await postWeatherDraft(jsonRequest({ eventId: "event-1", reviewerUserId: "client-spoof" }));

    expect(response.status).toBe(201);
    expect(createWeatherAlertDraftMock).toHaveBeenCalledWith({
      eventId: "event-1",
      reviewerUserId: "user-live-session"
    });
  });

  it("uses the authenticated coach or admin session for schedule event changes", async () => {
    saveScheduleEventMock.mockResolvedValue({
      ok: true,
      message: "Schedule saved.",
      event: {
        id: "event-1",
        organizationId: "org-1",
        teamId: "team-1",
        seasonId: "season-1",
        title: "Practice",
        eventType: "practice",
        startsAt: "2026-06-25T22:30:00.000Z",
        endsAt: "2026-06-25T23:30:00.000Z",
        locationName: "Field 1",
        locationAddress: "100 Park Ave",
        status: "scheduled",
        createdAt: "2026-06-25T12:00:00.000Z",
        updatedAt: "2026-06-25T12:00:00.000Z"
      },
      notificationCount: 1
    });

    const response = await postScheduleEvent(jsonRequest({
      actorUserId: "client-spoof",
      eventId: "event-1",
      organizationId: "org-1",
      seasonId: "season-1",
      teamId: "team-1",
      title: "Practice",
      eventType: "practice",
      startsAt: "2026-06-25T22:30:00.000Z",
      endsAt: "2026-06-25T23:30:00.000Z",
      locationName: "Field 1",
      locationAddress: "100 Park Ave",
      status: "scheduled"
    }));

    expect(response.status).toBe(201);
    expect(saveScheduleEventMock).toHaveBeenCalledWith({
      actorUserId: "user-live-session",
      eventId: "event-1",
      organizationId: "org-1",
      seasonId: "season-1",
      teamId: "team-1",
      title: "Practice",
      eventType: "practice",
      startsAt: "2026-06-25T22:30:00.000Z",
      endsAt: "2026-06-25T23:30:00.000Z",
      locationName: "Field 1",
      locationAddress: "100 Park Ave",
      fieldLocationId: undefined,
      opponent: undefined,
      status: "scheduled",
      reason: undefined
    });
  });

  it("uses the authenticated parent session for notification preferences", async () => {
    updateNotificationPreferenceMock.mockResolvedValue({ ok: true, message: "Preference saved.", preference: { id: "pref-1" } });

    const response = await postNotificationPreference(jsonRequest({
      teamId: "team-1",
      channel: "push",
      notificationType: "schedule_changed",
      enabled: false,
      userId: "client-spoof"
    }));

    expect(response.status).toBe(200);
    expect(updateNotificationPreferenceMock).toHaveBeenCalledWith({
      userId: "user-live-session",
      organizationId: undefined,
      teamId: "team-1",
      channel: "push",
      notificationType: "schedule_changed",
      enabled: false,
      quietHoursStart: undefined,
      quietHoursEnd: undefined,
      timezone: undefined
    });
  });

  it("uses the authenticated parent session for notification unsubscribes", async () => {
    updateNotificationPreferenceMock.mockResolvedValue({ ok: true, message: "Preference saved.", preference: { id: "pref-unsub-1" } });

    const response = await postNotificationUnsubscribe(jsonRequest({
      teamId: "team-1",
      channel: "push",
      notificationType: "schedule_changed",
      enabled: true,
      userId: "client-spoof"
    }));

    expect(response.status).toBe(200);
    expect(updateNotificationPreferenceMock).toHaveBeenCalledWith({
      userId: "user-live-session",
      organizationId: undefined,
      teamId: "team-1",
      channel: "push",
      notificationType: "schedule_changed",
      enabled: false,
      quietHoursStart: undefined,
      quietHoursEnd: undefined,
      timezone: undefined
    });
  });

  it("uses the authenticated admin session for reporting exports", async () => {
    createAdminExportMock.mockResolvedValue({
      ok: true,
      message: "roster export generated with 1 row(s).",
      filename: "roster-export.csv",
      contentType: "text/csv",
      csv: "team,player\nTiny Tigers,Mason M."
    });

    const response = await postAdminExport(jsonRequest({
      organizationId: "org-1",
      actorUserId: "client-spoof",
      kind: "roster"
    }));

    expect(response.status).toBe(200);
    expect(createAdminExportMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorUserId: "user-live-session",
      kind: "roster"
    });
  });

  it("uses the authenticated coach or admin session for provider delivery review", async () => {
    reviewNotificationDeliveryMock.mockResolvedValue({
      ok: true,
      message: "Provider delivery approved.",
      notification: { id: "notification-1", provider_approval_status: "approved", approved_at: "2026-06-23T12:00:00.000Z" },
      attempt: { id: "attempt-1", provider: "email", channel: "email", status: "queued", attempted_at: "2026-06-23T12:00:00.000Z" }
    });

    const response = await postProviderDeliveryReview(jsonRequest({
      notificationId: "notification-1",
      actorUserId: "client-spoof",
      decision: "approved",
      provider: "email"
    }));

    expect(response.status).toBe(200);
    expect(reviewNotificationDeliveryMock).toHaveBeenCalledWith({
      notificationId: "notification-1",
      actorUserId: "user-live-session",
      decision: "approved",
      provider: "email"
    });
  });

  it("uses the authenticated coach or admin session for provider retry queue reads", async () => {
    listProviderDeliveryRetryQueueMock.mockResolvedValue({
      ok: true,
      message: "Provider retry queue loaded for review. No external send occurred.",
      retryQueue: [{
        id: "attempt-1",
        notificationId: "notification-1",
        title: "Schedule changed",
        provider: "email",
        channel: "email",
        status: "suppressed",
        reason: "Provider retry review required.",
        attemptedAt: "2026-06-23T12:00:00.000Z",
        nextReviewAt: "2026-06-23T12:15:00.000Z"
      }]
    });

    const response = await getProviderDeliveryRetryPlan(new Request("http://localhost/api/provider-delivery/retry-plan", {
      headers: {
        authorization: "Bearer live-session"
      }
    }));

    expect(response.status).toBe(200);
    expect(listProviderDeliveryRetryQueueMock).toHaveBeenCalledWith({
      actorUserId: "user-live-session"
    });
  });

  it("records public mobile usage events for PWA/native decisions", async () => {
    recordMobileUsageEventMock.mockResolvedValue({ ok: true, message: "Mobile usage event recorded.", event: { id: "mobile-event-1" } });

    const response = await postMobileUsageEvent(new Request("http://localhost/api/mobile-usage-events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mobile Safari"
      },
      body: JSON.stringify({
        eventType: "install_prompt_shown",
        routePath: "/parent",
        metadata: { displayMode: "browser" }
      })
    }));

    expect(response.status).toBe(201);
    expect(recordMobileUsageEventMock).toHaveBeenCalledWith({
      eventType: "install_prompt_shown",
      routePath: "/parent",
      userAgent: "Mobile Safari",
      metadata: { displayMode: "browser" }
    });
  });

  it("uses the authenticated coach session for weekly updates", async () => {
    saveCoachWeeklyUpdateMock.mockResolvedValue({ ok: true, message: "Weekly update saved.", announcement: { id: "announcement-1" }, notificationCount: 1 });

    const response = await postWeeklyUpdate(jsonRequest({
      teamId: "team-1",
      coachUserId: "client-spoof",
      title: "Weekly update",
      body: "Please review RSVP and snack openings."
    }));

    expect(response.status).toBe(201);
    expect(saveCoachWeeklyUpdateMock).toHaveBeenCalledWith({
      teamId: "team-1",
      coachUserId: "user-live-session",
      title: "Weekly update",
      body: "Please review RSVP and snack openings."
    });
  });

  it("uses the authenticated coach session for Parent Replay publishing", async () => {
    const draft: ParentReplayDraft = {
      title: "Tiny Tigers Parent Replay",
      summary: "Coach-approved practice recap.",
      homeActivities: [],
      parentTranslations: [],
      microCoachingStreak: { label: "Team loop", completedFamilies: 0, totalFamilies: 0, completionRate: 0 },
      memoryMoment: { title: "Practice memory", detail: "Teamwork" },
      coachVideo: { title: "Video", url: "https://youtube.com/watch?v=test", note: "Watch together" },
      parentTip: "Keep it short.",
      teamQuest: "Two throws.",
      skillCards: [],
      parentEducation: "Short practice wins.",
      generatedAt: "2026-06-23T12:00:00.000Z",
      teamId: "team-1",
      coachUserId: "client-spoof",
      focusAreas: ["catching", "throwing"]
    };
    saveParentReplayMock.mockResolvedValue({ ok: true, message: "Parent Replay saved.", parentReplay: { id: "replay-1", ...draft, organizationId: "org-1", seasonId: "season-1", coachUserId: "user-live-session", status: "queued", createdAt: "2026-06-23T12:00:00.000Z" }, notificationCount: 1 });

    const response = await postParentReplay(jsonRequest({
      teamId: "team-1",
      coachUserId: "client-spoof",
      focusAreas: ["catching", "throwing"],
      draft
    }));

    expect(response.status).toBe(201);
    expect(saveParentReplayMock).toHaveBeenCalledWith({
      teamId: "team-1",
      actorUserId: "user-live-session",
      focusAreas: ["catching", "throwing"],
      draft
    });
  });

  it("uses the authenticated team member session for media reports", async () => {
    reportMediaItemMock.mockResolvedValue({ ok: true, message: "Media reported.", mediaItem: { id: "media-1" } });

    const response = await postMediaReport(jsonRequest({
      mediaItemId: "media-1",
      reporterUserId: "client-spoof",
      reason: "Review this link"
    }));

    expect(response.status).toBe(200);
    expect(reportMediaItemMock).toHaveBeenCalledWith({
      mediaItemId: "media-1",
      reporterUserId: "user-live-session",
      reason: "Review this link"
    });
  });

  it("uses the authenticated coach or admin session for media moderation", async () => {
    moderateMediaItemMock.mockResolvedValue({ ok: true, message: "Media moderation saved.", mediaItem: { id: "media-1" } });

    const response = await postMediaModeration(jsonRequest({
      mediaItemId: "media-1",
      reviewerUserId: "client-spoof",
      status: "hidden",
      visibility: "organization",
      reason: "Needs review"
    }));

    expect(response.status).toBe(200);
    expect(moderateMediaItemMock).toHaveBeenCalledWith({
      mediaItemId: "media-1",
      reviewerUserId: "user-live-session",
      status: "hidden",
      visibility: "organization",
      reason: "Needs review"
    });
  });

  it("uses the authenticated admin session for sponsor saves", async () => {
    saveSponsorMock.mockResolvedValue({
      ok: true,
      message: "Sponsor saved.",
      sponsor: {
        id: "sponsor-1",
        organizationId: "org-1",
        name: "Local Pizza",
        level: "league",
        teamId: undefined,
        url: "https://sponsor.example",
        status: "active",
        placementKey: "team_portal",
        logoUrl: "https://sponsor.example/logo.png"
      }
    });

    const response = await postSponsorSave(jsonRequest({
      organizationId: "org-1",
      actorUserId: "client-spoof",
      sponsorId: "sponsor-1",
      name: "Local Pizza",
      level: "league",
      url: "https://sponsor.example",
      status: "active",
      placementKey: "team_portal",
      logoUrl: "https://sponsor.example/logo.png"
    }));

    expect(response.status).toBe(200);
    expect(saveSponsorMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorUserId: "user-live-session",
      sponsorId: "sponsor-1",
      name: "Local Pizza",
      level: "league",
      teamId: undefined,
      url: "https://sponsor.example",
      status: "active",
      placementKey: "team_portal",
      logoUrl: "https://sponsor.example/logo.png"
    });
  });

  it("uses the authenticated admin session for tenant theme defaults", async () => {
    updateTenantThemeDefaultsMock.mockResolvedValue({
      ok: true,
      message: "Tenant theme defaults saved.",
      tenantDefaults: {
        organizationId: "org-1",
        themeKey: "baseball",
        mascot: "Tigers",
        primaryColor: "#174ea6",
        secondaryColor: "#fbbc04",
        logoStatus: "not_configured"
      },
      audit: undefined
    });

    const response = await postThemeDefaults(jsonRequest({
      organizationId: "org-1",
      actorUserId: "client-spoof",
      themeKey: "baseball",
      mascot: "Tigers",
      primaryColor: "#174ea6",
      secondaryColor: "#fbbc04"
    }));

    expect(response.status).toBe(200);
    expect(updateTenantThemeDefaultsMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorUserId: "user-live-session",
      themeKey: "baseball",
      mascot: "Tigers",
      primaryColor: "#174ea6",
      secondaryColor: "#fbbc04"
    });
  });

  it("uses the authenticated admin session for team membership changes", async () => {
    createTeamMembershipMock.mockResolvedValue({
      ok: true,
      message: "Membership saved.",
      membership: {
        id: "membership-1",
        teamId: "team-1",
        userId: "coach-1",
        role: "coach",
        status: "active"
      }
    });

    const response = await postTeamMembership(jsonRequest({
      teamId: "team-1",
      userId: "coach-1",
      actorUserId: "client-spoof",
      role: "coach"
    }));

    expect(response.status).toBe(201);
    expect(createTeamMembershipMock).toHaveBeenCalledWith({
      teamId: "team-1",
      userId: "coach-1",
      actorUserId: "user-live-session",
      role: "coach"
    });
  });

  it("uses the authenticated admin session for roster import audit trails", async () => {
    const analysis = {
      id: "import-1",
      status: "validated" as const,
      totalRows: 1,
      validRows: 1,
      warningRows: 0,
      errorRows: 0,
      rows: [
        {
          rowNumber: 2,
          raw: { team: "Tiny Tigers" },
          normalized: {
            teamName: "Tiny Tigers",
            teamId: "team-1",
            division: "3U",
            firstName: "Mason",
            lastInitial: "T",
            jersey: "7",
            parentName: "Jordan",
            parentEmail: "parent@example.com",
            parentPhone: "5551234567"
          },
          status: "valid" as const,
          issues: []
        }
      ],
      createdAt: "2026-06-24T12:00:00.000Z"
    };
    recordRosterImportAuditMock.mockResolvedValue({
      ok: true,
      message: "Audit saved.",
      rosterImport: {
        id: "import-1",
        status: "validated",
        total_rows: 1,
        valid_rows: 1,
        warning_rows: 0,
        error_rows: 0,
        created_at: "2026-06-24T12:00:00.000Z"
      }
    });

    const response = await postRosterImportAudit(jsonRequest({
      organizationId: "org-1",
      seasonId: "season-1",
      actorUserId: "client-spoof",
      filename: "roster.csv",
      analysis
    }));

    expect(response.status).toBe(201);
    expect(recordRosterImportAuditMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      seasonId: "season-1",
      actorUserId: "user-live-session",
      filename: "roster.csv",
      analysis
    });
  });

  it("uses the authenticated admin session for organization-scoped team setup", async () => {
    saveAdminTeamMock.mockResolvedValue({
      ok: true,
      message: "Team saved.",
      team: {
        id: "team-1",
        name: "Tiny Tigers",
        division: "3U",
        season_id: "season-1",
        coach_user_id: "coach-1",
        mascot: "Tigers",
        theme_key: "baseball",
        status: "active",
        archived_at: null
      }
    });

    const response = await postAdminTeam(jsonRequest({
      organizationId: "org-1",
      actorUserId: "client-spoof",
      seasonId: "season-1",
      name: "Tiny Tigers",
      division: "3U",
      mascot: "Tigers",
      themeKey: "baseball",
      primaryColor: "#1d4ed8",
      secondaryColor: "#f97316",
      coachUserId: "coach-1",
      status: "active"
    }));

    expect(response.status).toBe(201);
    expect(saveAdminTeamMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorUserId: "user-live-session",
      teamId: undefined,
      seasonId: "season-1",
      name: "Tiny Tigers",
      division: "3U",
      mascot: "Tigers",
      themeKey: "baseball",
      primaryColor: "#1d4ed8",
      secondaryColor: "#f97316",
      coachUserId: "coach-1",
      status: "active"
    });
  });

  it("uses the authenticated admin session for season lifecycle changes", async () => {
    saveAdminSeasonMock.mockResolvedValue({
      ok: true,
      message: "Season saved.",
      season: {
        id: "season-1",
        name: "Spring 2026",
        status: "active",
        starts_at: "2026-03-01T00:00:00.000Z",
        ends_at: "2026-06-30T23:59:59.000Z",
        archived_at: null
      }
    });

    const response = await postAdminSeason(jsonRequest({
      organizationId: "org-1",
      actorUserId: "client-spoof",
      seasonId: "season-1",
      name: "Spring 2026",
      startsAt: "2026-03-01T00:00:00.000Z",
      endsAt: "2026-06-30T23:59:59.000Z",
      status: "active"
    }));

    expect(response.status).toBe(201);
    expect(saveAdminSeasonMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorUserId: "user-live-session",
      seasonId: "season-1",
      name: "Spring 2026",
      startsAt: "2026-03-01T00:00:00.000Z",
      endsAt: "2026-06-30T23:59:59.000Z",
      status: "active"
    });
  });

  it("uses the authenticated admin session for roster lifecycle changes", async () => {
    saveRosterPlayerMock.mockResolvedValue({
      ok: true,
      message: "Roster saved.",
      player: {
        id: "player-1",
        team_id: "team-1",
        season_id: "season-1",
        first_name: "Mason",
        last_initial: "T",
        jersey: "7",
        roster_status: "active"
      }
    });

    const response = await postAdminRoster(jsonRequest({
      organizationId: "org-1",
      actorUserId: "client-spoof",
      playerId: "player-1",
      teamId: "team-1",
      seasonId: "season-1",
      firstName: "Mason",
      lastInitial: "T",
      jersey: "7",
      rosterStatus: "active"
    }));

    expect(response.status).toBe(201);
    expect(saveRosterPlayerMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorUserId: "user-live-session",
      playerId: "player-1",
      teamId: "team-1",
      seasonId: "season-1",
      firstName: "Mason",
      lastInitial: "T",
      jersey: "7",
      rosterStatus: "active"
    });
  });

  it("uses the authenticated admin session for guardian link repair", async () => {
    repairGuardianLinkMock.mockResolvedValue({
      ok: true,
      message: "Guardian repaired.",
      guardianLink: { id: "guardian-1", player_id: "player-1", parent_user_id: "parent-1", status: "active" }
    });

    const response = await postGuardianRepair(jsonRequest({
      organizationId: "org-1",
      actorUserId: "client-spoof",
      playerId: "player-1",
      parentUserId: "parent-1",
      relationship: "guardian"
    }));

    expect(response.status).toBe(200);
    expect(repairGuardianLinkMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorUserId: "user-live-session",
      playerId: "player-1",
      parentUserId: "parent-1",
      relationship: "guardian"
    });
  });
});
