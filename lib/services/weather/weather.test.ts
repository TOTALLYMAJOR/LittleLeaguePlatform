import { describe, expect, it } from "vitest";
import {
  getEnabledWeatherProviders,
  getWeatherEventDraft,
  nationalWeatherServiceProvider,
  normalizeWeatherEventDraft
} from ".";
import type { WeatherProviderEventInput } from "./types";

const eventInput: WeatherProviderEventInput = {
  teamId: "team-tigers",
  eventId: "event-1",
  eventTitle: "Tigers vs Bears",
  startsAt: "2026-07-01T14:00:00Z",
  latitude: 35.2271,
  longitude: -80.8431,
  locationName: "Field 1"
};

describe("weather providers", () => {
  it("normalizes National Weather Service forecasts into draft weather events", async () => {
    const fetcher: typeof fetch = async (resource) => {
      const url = String(resource);

      if (url.includes("/points/")) {
        return jsonResponse({
          properties: {
            forecastHourly: "https://api.weather.gov/gridpoints/test/hourly"
          }
        });
      }

      return jsonResponse({
        properties: {
          periods: [
            {
              startTime: "2026-07-01T14:00:00Z",
              temperature: 81,
              windSpeed: "12 to 18 mph",
              shortForecast: "Rain Showers",
              detailedForecast: "Showers likely before first pitch.",
              probabilityOfPrecipitation: {
                value: 65
              }
            }
          ]
        }
      });
    };

    const result = await nationalWeatherServiceProvider.getEventWeather(eventInput, {
      fetcher,
      now: "2026-06-27T12:00:00Z"
    });

    expect(result?.providerId).toBe("national_weather_service");
    expect(result?.draft.status).toBe("draft");
    expect(result?.draft.severity).toBe("delay");
    expect(result?.draft.createdAt).toBe("2026-06-27T12:00:00Z");
    expect(result?.draft.detail).toContain("National Weather Service forecast for Field 1");
  });

  it("falls back to Open-Meteo when National Weather Service has no usable forecast", async () => {
    const requestedUrls: string[] = [];
    const fetcher: typeof fetch = async (resource) => {
      const url = String(resource);
      requestedUrls.push(url);

      if (url.includes("api.weather.gov")) {
        return new Response("unavailable", { status: 503 });
      }

      return jsonResponse({
        hourly: {
          time: ["2026-07-01T13:00", "2026-07-01T14:00"],
          temperature_2m: [79, 82],
          precipitation_probability: [25, 82],
          wind_speed_10m: [8, 21],
          weather_code: [2, 95]
        }
      });
    };

    const result = await getWeatherEventDraft(eventInput, {
      fetcher,
      now: "2026-06-27T12:00:00Z"
    });

    expect(result?.providerId).toBe("open_meteo");
    expect(result?.draft.status).toBe("draft");
    expect(result?.draft.severity).toBe("cancel_risk");
    expect(requestedUrls.some((url) => url.includes("api.open-meteo.com"))).toBe(true);
  });

  it("keeps Tomorrow.io optional in the default provider order", () => {
    expect(getEnabledWeatherProviders().map((provider) => provider.id)).toEqual([
      "national_weather_service",
      "open_meteo"
    ]);
    expect(getEnabledWeatherProviders({ tomorrowApiKey: "tomorrow-key" }).map((provider) => provider.id)).toEqual([
      "national_weather_service",
      "open_meteo",
      "tomorrow_io"
    ]);
  });

  it("always normalizes weather alerts as draft state", () => {
    const result = normalizeWeatherEventDraft({
      ...eventInput,
      providerId: "open_meteo",
      providerName: "Open-Meteo",
      precipitationProbability: 95,
      raw: {}
    });

    expect(result.draft.status).toBe("draft");
    expect(result.draft.severity).toBe("cancel_risk");
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json"
    }
  });
}
