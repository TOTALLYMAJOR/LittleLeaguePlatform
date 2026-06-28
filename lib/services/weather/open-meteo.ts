import { normalizeWeatherEventDraft } from "./normalization";
import { fetchWeatherJson, hasCoordinates } from "./request";
import { parseProviderTime } from "./time";
import type { WeatherProvider } from "./types";

interface OpenMeteoForecastResponse {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: number[];
    wind_speed_10m?: number[];
    weather_code?: number[];
  };
}

export const openMeteoProvider: WeatherProvider = {
  id: "open_meteo",
  name: "Open-Meteo",
  enabled: () => true,
  async getEventWeather(input, config) {
    if (!hasCoordinates(input)) return null;

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(input.latitude));
    url.searchParams.set("longitude", String(input.longitude));
    url.searchParams.set("timezone", "UTC");
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("wind_speed_unit", "mph");
    url.searchParams.set(
      "hourly",
      "temperature_2m,precipitation_probability,wind_speed_10m,weather_code"
    );

    const payload = await fetchWeatherJson(url, config) as OpenMeteoForecastResponse | null;
    const index = findClosestHourlyIndex(payload?.hourly?.time ?? [], input.startsAt);
    if (!payload?.hourly || index < 0) return null;

    const weatherCode = coerceNumber(payload.hourly.weather_code?.[index]);

    return normalizeWeatherEventDraft({
      ...input,
      providerId: "open_meteo",
      providerName: "Open-Meteo",
      temperatureF: coerceNumber(payload.hourly.temperature_2m?.[index]),
      precipitationProbability: coerceNumber(payload.hourly.precipitation_probability?.[index]),
      windSpeedMph: coerceNumber(payload.hourly.wind_speed_10m?.[index]),
      weatherCode,
      shortForecast: weatherCodeDescription(weatherCode),
      observedAt: payload.hourly.time?.[index],
      createdAt: input.createdAt ?? config?.now,
      raw: {
        hourly: payload.hourly,
        selectedIndex: index
      }
    });
  }
};

function findClosestHourlyIndex(times: string[], targetTime: string) {
  const target = parseProviderTime(targetTime);
  if (!target) return -1;

  return times.reduce((closestIndex, time, index) => {
    const parsed = parseProviderTime(time);
    if (!parsed) return closestIndex;
    if (closestIndex < 0) return index;

    const closestTime = parseProviderTime(times[closestIndex]);
    if (!closestTime) return index;

    const distance = Math.abs(parsed.getTime() - target.getTime());
    const closestDistance = Math.abs(closestTime.getTime() - target.getTime());
    return distance < closestDistance ? index : closestIndex;
  }, -1);
}

function coerceNumber(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function weatherCodeDescription(code?: number) {
  if (typeof code !== "number") return undefined;

  const descriptions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
  };

  return descriptions[code] ?? `Weather code ${code}`;
}
