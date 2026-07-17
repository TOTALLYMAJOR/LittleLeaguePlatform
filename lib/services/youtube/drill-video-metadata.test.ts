import { describe, expect, it, vi } from "vitest";
import { fetchYouTubeDrillVideoMetadata, parseYouTubeDurationSeconds } from "./drill-video-metadata";

const input = {
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  sport: "baseball",
  skillCategory: "throwing",
  ageBand: "6U",
  difficulty: "beginner" as const
};

function response(payload: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => payload
  } as Response;
}

describe("YouTube drill video metadata provider", () => {
  it("fails closed when the provider key is missing", async () => {
    const result = await fetchYouTubeDrillVideoMetadata(input, { apiKey: "" });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("provider_not_configured");
    expect(result.message).toContain("not saved");
  });

  it("returns normalized metadata for embeddable videos", async () => {
    const fetcher = vi.fn().mockResolvedValue(response({
      items: [{
        id: "dQw4w9WgXcQ",
        snippet: {
          title: "Youth throwing drill",
          channelId: "channel-1",
          channelTitle: "Coach Channel",
          thumbnails: {
            high: { url: "https://i.ytimg.com/high.jpg" }
          }
        },
        contentDetails: { duration: "PT2M30S" },
        status: { embeddable: true, madeForKids: true, uploadStatus: "processed", privacyStatus: "public" }
      }]
    }));

    const result = await fetchYouTubeDrillVideoMetadata(input, {
      apiKey: "youtube-key",
      fetcher,
      now: "2026-07-17T12:00:00.000Z"
    });

    expect(result.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(result.metadata?.externalVideoId).toBe("dQw4w9WgXcQ");
    expect(result.metadata?.durationSeconds).toBe(150);
    expect(result.metadata?.sourceChannelId).toBe("channel-1");
    expect(result.metadata?.madeForKidsStatus).toBe(true);
  });

  it("rejects unavailable and non-embeddable videos", async () => {
    const unavailable = await fetchYouTubeDrillVideoMetadata(input, {
      apiKey: "youtube-key",
      fetcher: vi.fn().mockResolvedValue(response({ items: [] }))
    });
    const blocked = await fetchYouTubeDrillVideoMetadata(input, {
      apiKey: "youtube-key",
      fetcher: vi.fn().mockResolvedValue(response({
        items: [{ id: "dQw4w9WgXcQ", status: { embeddable: false } }]
      }))
    });

    expect(unavailable.code).toBe("unavailable");
    expect(blocked.code).toBe("not_embeddable");
  });

  it("parses ISO 8601 video durations", () => {
    expect(parseYouTubeDurationSeconds("PT45S")).toBe(45);
    expect(parseYouTubeDurationSeconds("PT1H2M3S")).toBe(3723);
    expect(parseYouTubeDurationSeconds("P1DT1H")).toBe(90000);
    expect(parseYouTubeDurationSeconds("bad")).toBeUndefined();
  });
});
