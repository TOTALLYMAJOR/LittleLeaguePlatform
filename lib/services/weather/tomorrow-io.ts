import { normalizeWeatherEventDraft } from "./normalization";
import { fetchWeatherJson } from "./request";
import { findClosestByTime } from "./time";
import type { WeatherProvider } from "./types";

interface TomorrowIoForecastResponse {
  timelines?: {
    hourly?: TomorrowIoHourlyForecast[];
  };
}

interface TomorrowIoHourlyForecast {
  time?: string;
  values?: {
    temperature?: number;
    precipitationProbability?: number;
    windSpeed?: number;
    weatherCode?: number;
    thunderstormProbability?: number;
  };
}

export const tomorrowIoProvider: WeatherProvider = {
  id: "tomorrow_io",
  name: "Tomorrow.io",
  enabled: (config) => Boolean(config?.tomorrowApiKey),
  async getEventWeather(input, config) {
    if (!config?.tomorrowApiKey) return null;

    const location = formatTomorrowLocation(input);
    if (!location) return null;

    const url = new URL("https://api.tomorrow.io/v4/weather/forecast");
    url.searchParams.set("location", location);
    url.searchParams.set("timesteps", "1h");
    url.searchParams.set("units", "imperial");
    url.searchParams.set("apikey", config.tomorrowApiKey);

    const payload = await fetchWeatherJson(url, config) as TomorrowIoForecastResponse | null;
    const hourly = payload?.timelines?.hourly ?? [];
    const forecast = findClosestByTime(hourly, (item) => item.time, input.startsAt);
    if (!forecast?.values) return null;

    return normalizeWeatherEventDraft({
      ...input,
      providerId: "tomorrow_io",
      providerName: "Tomorrow.io",
      temperatureF: coerceNumber(forecast.values.temperature),
      precipitationProbability: coerceNumber(forecast.values.precipitationProbability),
      windSpeedMph: coerceNumber(forecast.values.windSpeed),
      thunderstormProbability: coerceNumber(forecast.values.thunderstormProbability),
      weatherCode: coerceNumber(forecast.values.weatherCode),
      shortForecast: weatherCodeDescription(forecast.values.weatherCode),
      observedAt: forecast.time,
      createdAt: input.createdAt ?? config.now,
      raw: {
        hourlyForecast: forecast
      }
    });
  }
};

function formatTomorrowLocation(input: {
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  locationName?: string;
}) {
  if (
    typeof input.latitude === "number" &&
    Number.isFinite(input.latitude) &&
    typeof input.longitude === "number" &&
    Number.isFinite(input.longitude)
  ) {
    return `${input.latitude},${input.longitude}`;
  }

  return input.locationAddress || input.locationName;
}

function coerceNumber(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function weatherCodeDescription(code?: number) {
  if (typeof code !== "number") return undefined;

  const descriptions: Record<number, string> = {
    1000: "Clear",
    1001: "Cloudy",
    1100: "Mostly clear",
    1101: "Partly cloudy",
    1102: "Mostly cloudy",
    2000: "Fog",
    2100: "Light fog",
    4000: "Drizzle",
    4001: "Rain",
    4200: "Light rain",
    4201: "Heavy rain",
    5000: "Snow",
    5001: "Flurries",
    5100: "Light snow",
    5101: "Heavy snow",
    6000: "Freezing drizzle",
    6001: "Freezing rain",
    6200: "Light freezing rain",
    6201: "Heavy freezing rain",
    7000: "Ice pellets",
    7101: "Heavy ice pellets",
    7102: "Light ice pellets",
    8000: "Thunderstorm"
  };

  return descriptions[code] ?? `Weather code ${code}`;
}
