import {
  parseYouTubeVideoId,
  youtubeCanonicalUrl,
  type DrillVideoDifficulty
} from "@/lib/domain";

export interface YouTubeDrillVideoMetadataConfig {
  apiKey?: string;
  endpoint?: string;
  fetcher?: typeof fetch;
  now?: string;
}

export interface YouTubeDrillVideoMetadataInput {
  url: string;
  sport: string;
  skillCategory: string;
  ageBand: string;
  difficulty: DrillVideoDifficulty;
}

export interface YouTubeDrillVideoMetadata {
  provider: "youtube";
  externalVideoId: string;
  canonicalUrl: string;
  title: string;
  thumbnailUrl: string;
  sport: string;
  skillCategory: string;
  ageBand: string;
  difficulty: DrillVideoDifficulty;
  durationSeconds?: number;
  sourceChannel?: string;
  sourceChannelId?: string;
  madeForKidsStatus?: boolean;
  embeddable: boolean;
  lastValidatedAt: string;
  metadata: Record<string, unknown>;
}

export interface YouTubeDrillVideoMetadataResult {
  ok: boolean;
  message: string;
  metadata?: YouTubeDrillVideoMetadata;
  code?: "invalid_url" | "provider_not_configured" | "provider_error" | "unavailable" | "not_embeddable";
}

interface YouTubeVideosListResponse {
  items?: YouTubeVideoItem[];
  error?: {
    message?: string;
  };
}

interface YouTubeVideoItem {
  id?: string;
  snippet?: {
    title?: string;
    channelId?: string;
    channelTitle?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
  contentDetails?: {
    duration?: string;
  };
  status?: {
    embeddable?: boolean;
    madeForKids?: boolean;
    uploadStatus?: string;
    privacyStatus?: string;
  };
}

const DEFAULT_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";

export function getYouTubeDrillVideoConfigFromEnv(env: NodeJS.ProcessEnv = process.env): YouTubeDrillVideoMetadataConfig {
  return {
    apiKey: env.YOUTUBE_DATA_API_KEY
  };
}

export async function fetchYouTubeDrillVideoMetadata(
  input: YouTubeDrillVideoMetadataInput,
  config: YouTubeDrillVideoMetadataConfig = getYouTubeDrillVideoConfigFromEnv()
): Promise<YouTubeDrillVideoMetadataResult> {
  const parsed = parseYouTubeVideoId(input.url);
  if (!parsed.ok || !parsed.videoId) {
    return { ok: false, message: parsed.message, code: "invalid_url" };
  }

  if (!config.apiKey) {
    return {
      ok: false,
      message: "YOUTUBE_DATA_API_KEY is missing, so the drill video was not saved.",
      code: "provider_not_configured"
    };
  }

  const requestUrl = new URL(config.endpoint ?? DEFAULT_ENDPOINT);
  requestUrl.searchParams.set("part", "snippet,contentDetails,status");
  requestUrl.searchParams.set("id", parsed.videoId);
  requestUrl.searchParams.set("key", config.apiKey);

  const fetcher = config.fetcher ?? fetch;
  const response = await fetcher(requestUrl);
  if (!response.ok) {
    return {
      ok: false,
      message: "YouTube metadata could not be retrieved; the drill video was not saved.",
      code: "provider_error"
    };
  }

  const payload = await response.json().catch(() => null) as YouTubeVideosListResponse | null;
  const item = payload?.items?.[0];
  if (!item || item.id !== parsed.videoId) {
    return {
      ok: false,
      message: "YouTube video is unavailable to the Data API; the drill video was not saved.",
      code: "unavailable"
    };
  }

  if (item.status?.embeddable !== true) {
    return {
      ok: false,
      message: "YouTube video is not embeddable, so it cannot be added to the drill library.",
      code: "not_embeddable"
    };
  }

  return {
    ok: true,
    message: "YouTube metadata validated. The drill video reference can enter admin review.",
    metadata: {
      provider: "youtube",
      externalVideoId: parsed.videoId,
      canonicalUrl: youtubeCanonicalUrl(parsed.videoId),
      title: item.snippet?.title?.trim() || "Untitled YouTube drill",
      thumbnailUrl: bestThumbnailUrl(item.snippet?.thumbnails),
      sport: input.sport,
      skillCategory: input.skillCategory,
      ageBand: input.ageBand,
      difficulty: input.difficulty,
      durationSeconds: parseYouTubeDurationSeconds(item.contentDetails?.duration),
      sourceChannel: item.snippet?.channelTitle,
      sourceChannelId: item.snippet?.channelId,
      madeForKidsStatus: item.status?.madeForKids,
      embeddable: true,
      lastValidatedAt: config.now ?? new Date().toISOString(),
      metadata: {
        status: item.status ?? {},
        contentDetails: item.contentDetails ?? {},
        snippet: {
          channelId: item.snippet?.channelId,
          channelTitle: item.snippet?.channelTitle,
          privacyStatus: item.status?.privacyStatus,
          uploadStatus: item.status?.uploadStatus
        }
      }
    }
  };
}

export function parseYouTubeDurationSeconds(duration?: string) {
  if (!duration) return undefined;
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);
  if (!match) return undefined;
  const [, days = "0", hours = "0", minutes = "0", seconds = "0"] = match;
  const total = Number(days) * 86400 + Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
  return Number.isFinite(total) ? total : undefined;
}

function bestThumbnailUrl(thumbnails?: Record<string, { url?: string }>) {
  for (const key of ["maxres", "standard", "high", "medium", "default"]) {
    const url = thumbnails?.[key]?.url;
    if (url) return url;
  }
  return "";
}
