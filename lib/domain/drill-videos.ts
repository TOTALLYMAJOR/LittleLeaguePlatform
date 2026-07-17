export const DRILL_VIDEO_PROVIDERS = ["youtube", "vimeo", "native", "licensed"] as const;
export type DrillVideoProvider = (typeof DRILL_VIDEO_PROVIDERS)[number];

export const SUPPORTED_DRILL_VIDEO_PROVIDERS = ["youtube"] as const;
export type SupportedDrillVideoProvider = (typeof SUPPORTED_DRILL_VIDEO_PROVIDERS)[number];

export const DRILL_VIDEO_DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export type DrillVideoDifficulty = (typeof DRILL_VIDEO_DIFFICULTIES)[number];

export const DRILL_VIDEO_APPROVAL_STATUSES = ["pending", "approved", "rejected", "retired"] as const;
export type DrillVideoApprovalStatus = (typeof DRILL_VIDEO_APPROVAL_STATUSES)[number];

export const DRILL_VIDEO_SOURCE_STATUSES = ["pending", "approved", "blocked"] as const;
export type DrillVideoSourceStatus = (typeof DRILL_VIDEO_SOURCE_STATUSES)[number];

export const DRILL_VIDEO_ASSIGNMENT_CONTEXTS = ["practice_plan", "practice_recap"] as const;
export type DrillVideoAssignmentContext = (typeof DRILL_VIDEO_ASSIGNMENT_CONTEXTS)[number];

export interface DrillVideo {
  id: string;
  organizationId: string;
  provider: DrillVideoProvider;
  externalVideoId: string;
  canonicalUrl: string;
  title: string;
  thumbnailUrl: string;
  sport: string;
  skillCategory: string;
  ageBand: string;
  difficulty: DrillVideoDifficulty;
  durationSeconds?: number;
  coachInstructions?: string;
  safetyNotes?: string;
  sourceChannel?: string;
  sourceChannelId?: string;
  approvalStatus: DrillVideoApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  reviewNotes?: string;
  madeForKidsStatus?: boolean;
  embeddable: boolean;
  lastValidatedAt?: string;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DrillVideoSource {
  id: string;
  organizationId: string;
  provider: SupportedDrillVideoProvider;
  externalChannelId: string;
  title: string;
  approvalStatus: DrillVideoSourceStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DrillVideoAssignment {
  id: string;
  organizationId: string;
  drillVideoId: string;
  teamId: string;
  eventId?: string;
  assignedByUserId: string;
  usageContext: DrillVideoAssignmentContext;
  notes?: string;
  visibleToFamilies: boolean;
  createdAt: string;
}

export interface DrillVideoValidationResult {
  ok: boolean;
  message: string;
}

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function isSupportedDrillVideoProvider(provider: string): provider is SupportedDrillVideoProvider {
  return (SUPPORTED_DRILL_VIDEO_PROVIDERS as readonly string[]).includes(provider);
}

export function isDrillVideoDifficulty(value: string): value is DrillVideoDifficulty {
  return (DRILL_VIDEO_DIFFICULTIES as readonly string[]).includes(value);
}

export function normalizeDrillText(value: string, fallback: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || fallback;
}

export function parseYouTubeVideoId(url: string): DrillVideoValidationResult & { videoId?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, message: "YouTube drill video URL must be valid." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, message: "YouTube drill video URL must use HTTPS." };
  }

  const hostname = parsed.hostname.toLowerCase();
  let videoId = "";
  if (hostname === "youtu.be") {
    videoId = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
  } else if (["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com"].includes(hostname)) {
    if (parsed.pathname === "/watch") {
      videoId = parsed.searchParams.get("v") ?? "";
    } else {
      const [, route, id] = parsed.pathname.split("/");
      if (["embed", "shorts", "live"].includes(route)) {
        videoId = id ?? "";
      }
    }
  } else {
    return { ok: false, message: "Drill videos must use youtube.com, youtube-nocookie.com, or youtu.be." };
  }

  if (!YOUTUBE_VIDEO_ID_PATTERN.test(videoId)) {
    return { ok: false, message: "YouTube drill video ID could not be parsed." };
  }

  return { ok: true, message: "YouTube video ID parsed.", videoId };
}

export function youtubeCanonicalUrl(externalVideoId: string) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(externalVideoId)}`;
}

export function youtubePrivacyEmbedUrl(externalVideoId: string) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(externalVideoId)}`;
}

export function validateDrillVideoForApproval(input: {
  video: Pick<DrillVideo, "provider" | "approvalStatus" | "embeddable" | "lastValidatedAt" | "sourceChannelId">;
  source?: Pick<DrillVideoSource, "approvalStatus" | "externalChannelId">;
}): DrillVideoValidationResult {
  if (input.video.provider !== "youtube") {
    return { ok: false, message: "Only YouTube drill videos can be approved in v1." };
  }
  if (input.video.approvalStatus === "retired") {
    return { ok: false, message: "Retired drill videos cannot be re-approved without resubmission." };
  }
  if (!input.video.embeddable || !input.video.lastValidatedAt) {
    return { ok: false, message: "Drill video must be validated as embeddable before approval." };
  }
  if (!input.video.sourceChannelId || !input.source || input.source.externalChannelId !== input.video.sourceChannelId) {
    return { ok: false, message: "Drill video source channel must be reviewed before approval." };
  }
  if (input.source.approvalStatus !== "approved") {
    return { ok: false, message: "Drill video source channel must be allowlisted before approval." };
  }

  return { ok: true, message: "Drill video can be approved." };
}

export function validateDrillVideoAssignment(input: {
  video: Pick<DrillVideo, "approvalStatus" | "provider">;
  visibleToFamilies?: boolean;
}): DrillVideoValidationResult {
  if (input.video.provider !== "youtube") {
    return { ok: false, message: "Only YouTube drill videos can be assigned in v1." };
  }
  if (input.video.approvalStatus !== "approved") {
    return { ok: false, message: "Only approved drill videos can be assigned to coach practice planning." };
  }
  if (input.visibleToFamilies) {
    return { ok: false, message: "Family-facing drill video embeds are deferred for v1." };
  }
  return { ok: true, message: "Drill video can be assigned." };
}
