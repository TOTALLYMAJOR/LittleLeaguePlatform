import { normalizeWeatherEventDraft } from "./normalization";
import { fetchWeatherJson, hasCoordinates } from "./request";
import { findClosestByTime } from "./time";
import type { WeatherProvider } from "./types";

interface NationalWeatherServicePointResponse {
  properties?: {
    forecastHourly?: string;
    forecast?: string;
  };
}

interface NationalWeatherServiceForecastResponse {
  properties?: {
    periods?: NationalWeatherServicePeriod[];
  };
}

interface NationalWeatherServicePeriod {
  startTime?: string;
  temperature?: number;
  windSpeed?: string;
  shortForecast?: string;
  detailedForecast?: string;
  probabilityOfPrecipitation?: {
    value?: number | null;
  };
}

export const nationalWeatherServiceProvider: WeatherProvider = {
  id: "national_weather_service",
  name: "National Weather Service",
  enabled: () => true,
  async getEventWeather(input, config) {
    if (!hasCoordinates(input)) return null;

    const pointUrl = new URL(`https://api.weather.gov/points/${input.latitude.toFixed(4)},${input.longitude.toFixed(4)}`);
    const pointPayload = await fetchWeatherJson(pointUrl, config) as NationalWeatherServicePointResponse | null;
    const forecastUrl = pointPayload?.properties?.forecastHourly ?? pointPayload?.properties?.forecast;
    if (!forecastUrl) return null;

    const forecastPayload = await fetchWeatherJson(forecastUrl, config) as NationalWeatherServiceForecastResponse | null;
    const periods = forecastPayload?.properties?.periods ?? [];
    const period = findClosestByTime(periods, (item) => item.startTime, input.startsAt);
    if (!period) return null;

    return normalizeWeatherEventDraft({
      ...input,
      providerId: "national_weather_service",
      providerName: "National Weather Service",
      temperatureF: period.temperature,
      precipitationProbability: coerceNumber(period.probabilityOfPrecipitation?.value),
      windSpeedMph: parseWindSpeed(period.windSpeed),
      shortForecast: period.shortForecast,
      description: period.detailedForecast,
      observedAt: period.startTime,
      createdAt: input.createdAt ?? config?.now,
      raw: {
        point: pointPayload,
        forecastPeriod: period
      }
    });
  }
};

function parseWindSpeed(value?: string) {
  if (!value) return undefined;
  const speeds = [...value.matchAll(/\d+(\.\d+)?/g)]
    .map((match) => Number(match[0]))
    .filter((speed) => Number.isFinite(speed));

  if (speeds.length === 0) return undefined;
  return Math.max(...speeds);
}

function coerceNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
