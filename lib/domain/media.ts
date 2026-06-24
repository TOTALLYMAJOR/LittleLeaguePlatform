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
