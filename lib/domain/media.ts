import type { AppState, MediaItem, UserRole } from "./types";

export interface MediaUrlValidation {
  ok: boolean;
  message: string;
}

export function validateMediaUrl(type: MediaItem["type"], url: string): MediaUrlValidation {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, message: "Media link must be a valid URL." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, message: "Media links must use HTTPS." };
  }

  if (type === "google_photos") {
    const allowedHosts = new Set(["photos.google.com", "photos.app.goo.gl"]);
    return allowedHosts.has(parsed.hostname)
      ? { ok: true, message: "Google Photos link looks valid." }
      : { ok: false, message: "Google Photos links must use photos.google.com or photos.app.goo.gl." };
  }

  if (type === "youtube") {
    const allowedHosts = new Set(["www.youtube.com", "youtube.com", "youtu.be"]);
    return allowedHosts.has(parsed.hostname)
      ? { ok: true, message: "YouTube link looks valid." }
      : { ok: false, message: "YouTube links must use youtube.com or youtu.be." };
  }

  return { ok: false, message: "Unsupported media type." };
}

export function approveMediaItem(item: MediaItem): MediaItem {
  return { ...item, moderationStatus: "approved", reportCount: item.reportCount ?? 0 };
}

export function rejectMediaItem(item: MediaItem, reason = "Rejected by coach/admin review.") {
  return {
    item: { ...item, moderationStatus: "rejected" as const },
    auditSummary: `${item.title}: ${reason}`
  };
}

export function getUploadStorageProviderStatus(configured = false) {
  return {
    configured,
    provider: configured ? "Supabase Storage" : "not_configured",
    detail: configured
      ? "Upload storage is configured; consent and moderation still apply."
      : "Upload storage provider is not configured; media intake remains link-based."
  };
}

export function getMediaReportingSummary(items: MediaItem[]) {
  return {
    totalReports: items.reduce((total, item) => total + (item.reportCount ?? 0), 0),
    pendingReview: items.filter((item) => (item.reportCount ?? 0) > 0 || item.moderationStatus === "pending").length,
    hiddenOrRejected: items.filter((item) => item.moderationStatus === "hidden" || item.moderationStatus === "rejected").length
  };
}

export function getFamilyFacingModerationQueue(items: MediaItem[]) {
  return items
    .filter((item) => (item.reportCount ?? 0) > 0 || item.moderationStatus === "pending")
    .map((item) => ({
      item,
      familyStatus: "under_review" as const,
      message: `${item.title} is under review by coach/admin staff.`
    }));
}

export function getMediaRetentionPolicy() {
  return {
    seasonMedia: "Retain approved team media through the active season and archive export window.",
    rejectedMedia: "Remove rejected or takedown media from family-facing views immediately.",
    chatLinkedMedia: "Preserve only audit metadata after chat retention cleanup."
  };
}

export function canViewMediaByRole(item: MediaItem, role: UserRole) {
  const status = item.moderationStatus ?? "approved";
  if (role === "admin") return true;
  if (role === "coach") return status !== "removed";
  return status === "approved" && (item.visibility ?? "team") === "team";
}

export function getMediaConsentControls() {
  return [
    { label: "Team media consent", enabled: true, detail: "Parents can ask staff to hide or review team media." },
    { label: "Player-specific consent", enabled: false, detail: "Per-player consent requires explicit roster-level settings." }
  ];
}

export function getPerPlayerMediaConsent(playerId: string, optedInPlayerIds: string[] = []) {
  return {
    playerId,
    consent: optedInPlayerIds.includes(playerId) ? "granted" as const : "needs_review" as const
  };
}

export function getPhotoVisibilityFlags(item: MediaItem) {
  return {
    teamVisible: (item.moderationStatus ?? "approved") === "approved" && (item.visibility ?? "team") === "team",
    organizationVisible: (item.moderationStatus ?? "approved") === "approved" && item.visibility === "organization",
    privateAlbumOnly: item.moderationStatus === "hidden" || item.moderationStatus === "pending"
  };
}

export function getPrivateTeamAlbum(items: MediaItem[], teamId: string) {
  return items.filter((item) => item.teamId === teamId && getPhotoVisibilityFlags(item).teamVisible);
}

export function createMediaTakedownRequest(item: MediaItem, reason: string) {
  return {
    itemId: item.id,
    title: `Takedown request: ${item.title}`,
    reason,
    status: "needs_review" as const
  };
}

export function getParentSubmittedMoments(state: AppState, teamId: string) {
  return state.mediaItems
    .filter((item) => item.teamId === teamId && (item.moderationStatus ?? "approved") === "approved")
    .map((item) => ({
      id: `parent-moment-${item.id}`,
      title: item.title,
      source: "parent_submitted" as const
    }));
}

export function getVolunteerMoments(state: AppState, teamId: string) {
  return state.volunteerSignups
    .filter((signup) => signup.teamId === teamId && signup.status === "filled")
    .map((signup) => ({
      id: `volunteer-moment-${signup.id}`,
      title: `${signup.role} covered`,
      source: "volunteer" as const
    }));
}

export function exportSeasonMemories(state: AppState, teamId: string) {
  const parentMoments = getParentSubmittedMoments(state, teamId);
  const volunteerMoments = getVolunteerMoments(state, teamId);
  return {
    filename: `${teamId}-season-memories.csv`,
    rows: [...parentMoments, ...volunteerMoments].map((moment) => `${moment.id},${moment.title},${moment.source}`)
  };
}

export function getSnackReminders(state: AppState, teamId: string) {
  return state.snackScheduleSlots
    .filter((slot) => slot.teamId === teamId)
    .map((slot) => {
      const event = state.events.find((item) => item.id === slot.eventId);
      return {
        id: `snack-reminder-${slot.id}`,
        title: slot.status === "open" ? "Snack slot open" : "Snack reminder",
        detail: `${slot.item} · ${event?.title ?? "Team event"}`
      };
    });
}
