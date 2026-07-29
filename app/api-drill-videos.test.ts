import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postDrillAssignment } from "./api/coach/drill-video-assignments/route";
import { POST as postDrillVideo } from "./api/coach/drill-videos/route";
import { POST as postDrillSourceReview } from "./api/admin/drill-video-sources/review/route";
import { POST as postDrillVideoReview } from "./api/admin/drill-videos/review/route";
import {
  assignDrillVideoToTeam,
  reviewDrillVideo,
  reviewDrillVideoSource,
  submitCoachDrillVideoReference
} from "@/lib/supabase/drill-videos";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

vi.mock("@/lib/supabase/route-auth", () => ({
  requireAuthenticatedRouteUser: vi.fn()
}));

vi.mock("@/lib/supabase/drill-videos", () => ({
  assignDrillVideoToTeam: vi.fn(),
  reviewDrillVideo: vi.fn(),
  reviewDrillVideoSource: vi.fn(),
  submitCoachDrillVideoReference: vi.fn()
}));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const submitMock = vi.mocked(submitCoachDrillVideoReference);
const assignMock = vi.mocked(assignDrillVideoToTeam);
const reviewVideoMock = vi.mocked(reviewDrillVideo);
const reviewSourceMock = vi.mocked(reviewDrillVideoSource);

const drillVideo = {
  id: "video-1",
  organizationId: "org-1",
  provider: "youtube" as const,
  externalVideoId: "dQw4w9WgXcQ",
  canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  title: "Throwing drill",
  thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  sport: "baseball",
  skillCategory: "throwing",
  ageBand: "6U",
  difficulty: "beginner" as const,
  approvalStatus: "pending" as const,
  embeddable: true,
  createdAt: "2026-07-17T12:00:00.000Z",
  updatedAt: "2026-07-17T12:00:00.000Z"
};

const drillVideoAssignment = {
  id: "assignment-1",
  organizationId: "org-1",
  drillVideoId: "video-1",
  teamId: "team-1",
  assignedByUserId: "user-live-session",
  usageContext: "practice_plan" as const,
  visibleToFamilies: false,
  createdAt: "2026-07-17T12:00:00.000Z"
};

const drillVideoSource = {
  id: "source-1",
  organizationId: "org-1",
  provider: "youtube" as const,
  externalChannelId: "channel-1",
  title: "Coach Channel",
  approvalStatus: "approved" as const,
  createdAt: "2026-07-17T12:00:00.000Z",
  updatedAt: "2026-07-17T12:00:00.000Z"
};

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

describe("drill video API routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authMock.mockResolvedValue({ ok: true, user: { id: "user-live-session", email: "coach@example.com" } });
  });

  it("requires authentication before coach drill video submission", async () => {
    authMock.mockResolvedValue({ ok: false, message: "Auth required." });

    const response = await postDrillVideo(jsonRequest({}));

    expect(response.status).toBe(401);
    expect(submitMock).not.toHaveBeenCalled();
  });

  it("uses the authenticated coach for drill video submissions", async () => {
    submitMock.mockResolvedValue({ ok: true, message: "Saved.", drillVideo });

    const response = await postDrillVideo(jsonRequest({
      teamId: "team-1",
      provider: "youtube",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      sport: "baseball",
      skillCategory: "throwing",
      ageBand: "6U",
      difficulty: "beginner",
      coachInstructions: "Keep it short.",
      safetyNotes: "Use soft toss."
    }));

    expect(response.status).toBe(201);
    expect(submitMock).toHaveBeenCalledWith({
      actorUserId: "user-live-session",
      teamId: "team-1",
      provider: "youtube",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      sport: "baseball",
      skillCategory: "throwing",
      ageBand: "6U",
      difficulty: "beginner",
      coachInstructions: "Keep it short.",
      safetyNotes: "Use soft toss."
    });
  });

  it("uses the authenticated coach for drill video assignments", async () => {
    assignMock.mockResolvedValue({ ok: true, message: "Assigned.", assignment: drillVideoAssignment });

    const response = await postDrillAssignment(jsonRequest({
      drillVideoId: "video-1",
      teamId: "team-1",
      eventId: "event-1",
      usageContext: "practice_plan",
      notes: "Use before practice."
    }));

    expect(response.status).toBe(201);
    expect(assignMock).toHaveBeenCalledWith({
      actorUserId: "user-live-session",
      drillVideoId: "video-1",
      teamId: "team-1",
      eventId: "event-1",
      usageContext: "practice_plan",
      notes: "Use before practice."
    });
  });

  it("rejects unsupported drill assignment contexts before persistence", async () => {
    const response = await postDrillAssignment(jsonRequest({
      drillVideoId: "video-1",
      teamId: "team-1",
      usageContext: "athlete_assignment"
    }));

    expect(response.status).toBe(400);
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("uses the authenticated admin for source and video review", async () => {
    reviewSourceMock.mockResolvedValue({ ok: true, message: "Source approved.", source: drillVideoSource });
    reviewVideoMock.mockResolvedValue({ ok: true, message: "Video approved.", drillVideo });

    const sourceResponse = await postDrillSourceReview(jsonRequest({
      sourceId: "source-1",
      status: "approved",
      reviewNotes: "Good source."
    }));
    const videoResponse = await postDrillVideoReview(jsonRequest({
      drillVideoId: "video-1",
      status: "approved",
      reviewNotes: "Good drill."
    }));

    expect(sourceResponse.status).toBe(200);
    expect(videoResponse.status).toBe(200);
    expect(reviewSourceMock).toHaveBeenCalledWith({
      sourceId: "source-1",
      reviewerUserId: "user-live-session",
      status: "approved",
      reviewNotes: "Good source."
    });
    expect(reviewVideoMock).toHaveBeenCalledWith({
      drillVideoId: "video-1",
      reviewerUserId: "user-live-session",
      status: "approved",
      reviewNotes: "Good drill."
    });
  });
});
