import type { MediaItem } from "./types";

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

export function approveMediaItem(item: MediaItem, reason = "Approved by coach/admin review."): MediaItem {
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
