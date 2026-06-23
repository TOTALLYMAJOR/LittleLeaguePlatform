import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postRsvp } from "./api/rsvps/route";
import { POST as postSnackClaim } from "./api/snack-slots/claim/route";
import { POST as postVolunteerClaim } from "./api/volunteer-signups/claim/route";
import { POST as postWeatherDraft } from "./api/weather-alerts/draft/route";
import {
  claimSnackSlot,
  claimVolunteerRole,
  createWeatherAlertDraft,
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
  updateParentRsvp: vi.fn()
}));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const updateParentRsvpMock = vi.mocked(updateParentRsvp);
const claimSnackSlotMock = vi.mocked(claimSnackSlot);
const claimVolunteerRoleMock = vi.mocked(claimVolunteerRole);
const createWeatherAlertDraftMock = vi.mocked(createWeatherAlertDraft);

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
});
