import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  getWeatherEventDraft: vi.fn()
}));

vi.mock("./admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient
}));

vi.mock("@/lib/services/weather", () => ({
  getWeatherEventDraft: mocks.getWeatherEventDraft
}));

import { createWeatherAlertDraft } from "./operations";

describe("createWeatherAlertDraft", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-28T12:00:00.000Z"));
    mocks.createSupabaseAdminClient.mockReset();
    mocks.getWeatherEventDraft.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the weather provider chain and saves only draft weather alerts", async () => {
    const eventQuery = queryBuilder({
      data: {
        id: "event-1",
        organization_id: "org-1",
        team_id: "team-1",
        title: "Tiny Tigers vs Rookie Rockets",
        starts_at: "2026-07-01T23:00:00.000Z",
        location_name: "Field 1",
        location_address: "100 Park Ave",
        latitude: 35.2271,
        longitude: -80.8431
      },
      error: null
    });
    const alertQuery = queryBuilder({
      data: {
        id: "weather-1",
        headline: "Weather watch for Tiny Tigers vs Rookie Rockets",
        detail: "Open-Meteo forecast for Field 1.",
        severity: "watch",
        status: "draft",
        provider: "open_meteo",
        created_at: "2026-06-28T12:00:00.000Z"
      },
      error: null
    });
    const from = vi.fn((table: string) => table === "events" ? eventQuery : alertQuery);
    mocks.createSupabaseAdminClient.mockReturnValue({ from });
    mocks.getWeatherEventDraft.mockResolvedValue({
      providerId: "open_meteo",
      draft: {
        teamId: "team-1",
        eventId: "event-1",
        headline: "Weather watch for Tiny Tigers vs Rookie Rockets",
        detail: "Open-Meteo forecast for Field 1.",
        severity: "watch",
        status: "draft",
        createdAt: "2026-06-28T12:00:00.000Z"
      },
      raw: { hourly: { selectedIndex: 1 } }
    });

    const result = await createWeatherAlertDraft({
      eventId: "event-1",
      reviewerUserId: "coach-1"
    });

    expect(result.ok).toBe(true);
    expect(mocks.getWeatherEventDraft).toHaveBeenCalledWith({
      teamId: "team-1",
      eventId: "event-1",
      eventTitle: "Tiny Tigers vs Rookie Rockets",
      startsAt: "2026-07-01T23:00:00.000Z",
      latitude: 35.2271,
      longitude: -80.8431,
      locationName: "Field 1",
      locationAddress: "100 Park Ave"
    }, {
      now: "2026-06-28T12:00:00.000Z",
      tomorrowApiKey: process.env.TOMORROW_API_KEY || process.env.WEATHER_PROVIDER_API_KEY,
      userAgent: process.env.WEATHER_USER_AGENT
    });
    expect(alertQuery.insert).toHaveBeenCalledWith({
      team_id: "team-1",
      event_id: "event-1",
      headline: "Weather watch for Tiny Tigers vs Rookie Rockets",
      detail: "Open-Meteo forecast for Field 1.",
      severity: "watch",
      status: "draft",
      provider: "open_meteo",
      provider_payload: { hourly: { selectedIndex: 1 } },
      reviewed_by_user_id: "coach-1",
      reviewed_at: "2026-06-28T12:00:00.000Z"
    });
  });
});

function queryBuilder(result: unknown) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result))
  };
  return builder;
}
