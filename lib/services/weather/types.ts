import type { WeatherAlertSeverity, WeatherEventDraft } from "../../domain/contracts";

export const WEATHER_PROVIDER_IDS = ["national_weather_service", "open_meteo", "tomorrow_io"] as const;
export type WeatherProviderId = (typeof WEATHER_PROVIDER_IDS)[number];

export interface WeatherProviderEventInput {
  teamId: string;
  eventId: string;
  eventTitle: string;
  startsAt: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;
  createdAt?: string;
}

export interface WeatherProviderConfig {
  fetcher?: typeof fetch;
  now?: string;
  tomorrowApiKey?: string;
  userAgent?: string;
}

export interface WeatherProviderForecast {
  providerId: WeatherProviderId;
  draft: WeatherEventDraft;
  observedAt?: string;
  raw: unknown;
}

export interface WeatherProvider {
  id: WeatherProviderId;
  name: string;
  enabled(config?: WeatherProviderConfig): boolean;
  getEventWeather(input: WeatherProviderEventInput, config?: WeatherProviderConfig): Promise<WeatherProviderForecast | null>;
}

export interface WeatherForecastSignals {
  temperatureF?: number;
  precipitationProbability?: number;
  windSpeedMph?: number;
  thunderstormProbability?: number;
  weatherCode?: number;
  shortForecast?: string;
  description?: string;
  severity?: WeatherAlertSeverity;
  observedAt?: string;
}

export interface WeatherNormalizationInput extends WeatherProviderEventInput, WeatherForecastSignals {
  providerId: WeatherProviderId;
  providerName: string;
  raw: unknown;
}
