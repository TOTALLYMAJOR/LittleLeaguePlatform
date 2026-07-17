import { describe, expect, it } from "vitest";
import {
  parseYouTubeVideoId,
  validateDrillVideoAssignment,
  validateDrillVideoForApproval,
  youtubePrivacyEmbedUrl,
  type DrillVideo,
  type DrillVideoSource
} from "./drill-videos";

const approvedSource: DrillVideoSource = {
  id: "source-1",
  organizationId: "org-1",
  provider: "youtube",
  externalChannelId: "channel-1",
  title: "Approved Channel",
  approvalStatus: "approved",
  reviewedBy: "admin-1",
  reviewedAt: "2026-07-17T12:00:00.000Z",
  createdAt: "2026-07-17T12:00:00.000Z",
  updatedAt: "2026-07-17T12:00:00.000Z"
};

const pendingVideo: DrillVideo = {
  id: "video-1",
  organizationId: "org-1",
  provider: "youtube",
  externalVideoId: "dQw4w9WgXcQ",
  canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  title: "Throwing drill",
  thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  sport: "baseball",
  skillCategory: "throwing",
  ageBand: "6U",
  difficulty: "beginner",
  sourceChannel: "Approved Channel",
  sourceChannelId: "channel-1",
  approvalStatus: "pending",
  embeddable: true,
  lastValidatedAt: "2026-07-17T12:00:00.000Z",
  createdAt: "2026-07-17T12:00:00.000Z",
  updatedAt: "2026-07-17T12:00:00.000Z"
};

describe("drill video domain rules", () => {
  it("parses supported YouTube URL shapes and builds privacy-enhanced embeds", () => {
    expect(parseYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ").videoId).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ").videoId).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ").videoId).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ").videoId).toBe("dQw4w9WgXcQ");
    expect(youtubePrivacyEmbedUrl("dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("rejects non-HTTPS or non-YouTube drill video URLs", () => {
    expect(parseYouTubeVideoId("http://youtu.be/dQw4w9WgXcQ").ok).toBe(false);
    expect(parseYouTubeVideoId("https://example.com/watch?v=dQw4w9WgXcQ").ok).toBe(false);
    expect(parseYouTubeVideoId("https://www.youtube.com/watch?v=bad").ok).toBe(false);
  });

  it("requires validation and an allowlisted source before approval", () => {
    expect(validateDrillVideoForApproval({ video: pendingVideo, source: approvedSource }).ok).toBe(true);
    expect(validateDrillVideoForApproval({
      video: pendingVideo,
      source: { ...approvedSource, approvalStatus: "pending" }
    }).message).toContain("allowlisted");
    expect(validateDrillVideoForApproval({
      video: { ...pendingVideo, embeddable: false },
      source: approvedSource
    }).message).toContain("embeddable");
  });

  it("keeps assignments approved and coach-planning only in v1", () => {
    expect(validateDrillVideoAssignment({
      video: { ...pendingVideo, approvalStatus: "approved" }
    }).ok).toBe(true);
    expect(validateDrillVideoAssignment({ video: pendingVideo }).message).toContain("Only approved");
    expect(validateDrillVideoAssignment({
      video: { ...pendingVideo, approvalStatus: "approved" },
      visibleToFamilies: true
    }).message).toContain("deferred");
  });
});
