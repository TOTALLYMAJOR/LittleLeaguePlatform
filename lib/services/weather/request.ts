import type { WeatherProviderConfig } from "./types";

const DEFAULT_USER_AGENT = "LittleLeagueHQ/1.0";

export async function fetchWeatherJson(url: string | URL, config?: WeatherProviderConfig, init?: RequestInit) {
  const fetcher = config?.fetcher ?? fetch;
  const response = await fetcher(url, {
    ...init,
    headers: {
      accept: "application/json",
      "user-agent": config?.userAgent ?? DEFAULT_USER_AGENT,
      ...init?.headers
    }
  });

  if (!response.ok) return null;
  return response.json() as Promise<unknown>;
}

export function hasCoordinates<T extends { latitude?: number; longitude?: number }>(
  input: T
): input is T & { latitude: number; longitude: number } {
  return typeof input.latitude === "number" && Number.isFinite(input.latitude) &&
    typeof input.longitude === "number" && Number.isFinite(input.longitude);
}
