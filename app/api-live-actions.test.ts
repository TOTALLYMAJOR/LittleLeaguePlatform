import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postRsvp } from "./api/rsvps/route";
import { POST as postNotificationPreference } from "./api/notification-preferences/route";
import { POST as postParentReplay } from "./api/coach/parent-replay/route";
import { POST as postWeeklyUpdate } from "./api/coach/weekly-update/route";
import { POST as postSponsorSave } from "./api/admin/sponsors/route";
import { POST as postThemeDefaults } from "./api/admin/theme-defaults/route";
import { POST as postMediaReport } from "./api/media/report/route";
import { POST as postMediaModeration } from "./api/media/moderation/route";
import { POST as postSnackClaim } from "./api/snack-slots/claim/route";
import { POST as postVolunteerClaim } from "./api/volunteer-signups/claim/route";
import { POST as postWeatherDraft } from "./api/weather-alerts/draft/route";
import type { ParentReplayDraft } from "@/lib/domain";
import { updateTenantThemeDefaults } from "@/lib/supabase/team-branding";
import {
  claimSnackSlot,
  claimVolunteerRole,
  createWeatherAlertDraft,
  saveCoachWeeklyUpdate,
  saveSponsor,
  moderateMediaItem,
  reportMediaItem,
  saveParentReplay,
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
  saveParentReplay: vi.fn(),
  updateNotificationPreference: vi.fn(),
  updateParentRsvp: vi.fn()
}));

vi.mock("@/lib/supabase/team-branding", () => ({
  updateTenantThemeDefaults: vi.fn()
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
const saveParentReplayMock = vi.mocked(saveParentReplay);
const updateNotificationPreferenceMock = vi.mocked(updateNotificationPreference);
const updateTenantThemeDefaultsMock = vi.mocked(updateTenantThemeDefaults);

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
});
