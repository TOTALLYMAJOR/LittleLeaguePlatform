import type { WeatherAlertSeverity } from "../../domain/contracts";
import type { WeatherNormalizationInput, WeatherProviderForecast } from "./types";

const CANCEL_RISK_PATTERNS = /\b(lightning|thunderstorm|tornado|hail|severe|hurricane|ice storm)\b/i;
const DELAY_PATTERNS = /\b(rain|showers|snow|sleet|storm|wind|fog|drizzle)\b/i;
const THUNDERSTORM_WEATHER_CODES = new Set([95, 96, 99, 8000]);
const PRECIPITATION_WEATHER_CODES = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86,
  4000, 4001, 4200, 4201, 5000, 5001, 5100, 5101, 6000, 6001, 6200, 6201, 7000, 7101, 7102
]);

export function normalizeWeatherEventDraft(input: WeatherNormalizationInput): WeatherProviderForecast {
  const severity = input.severity ?? inferWeatherAlertSeverity(input);
  return {
    providerId: input.providerId,
    observedAt: input.observedAt,
    raw: input.raw,
    draft: {
      teamId: input.teamId,
      eventId: input.eventId,
      headline: buildWeatherHeadline(input.eventTitle, severity),
      detail: buildWeatherDetail(input),
      severity,
      status: "draft",
      createdAt: input.createdAt ?? new Date().toISOString()
    }
  };
}

export function inferWeatherAlertSeverity(input: {
  shortForecast?: string;
  description?: string;
  precipitationProbability?: number;
  windSpeedMph?: number;
  thunderstormProbability?: number;
  weatherCode?: number;
}): WeatherAlertSeverity {
  const summary = `${input.shortForecast ?? ""} ${input.description ?? ""}`;
  const precipitationProbability = input.precipitationProbability ?? 0;
  const windSpeedMph = input.windSpeedMph ?? 0;
  const thunderstormProbability = input.thunderstormProbability ?? 0;

  if (
    CANCEL_RISK_PATTERNS.test(summary) ||
    precipitationProbability >= 80 ||
    windSpeedMph >= 35 ||
    thunderstormProbability >= 40 ||
    (typeof input.weatherCode === "number" && THUNDERSTORM_WEATHER_CODES.has(input.weatherCode))
  ) {
    return "cancel_risk";
  }

  if (
    DELAY_PATTERNS.test(summary) ||
    precipitationProbability >= 50 ||
    windSpeedMph >= 20 ||
    thunderstormProbability >= 15 ||
    (typeof input.weatherCode === "number" && PRECIPITATION_WEATHER_CODES.has(input.weatherCode))
  ) {
    return "delay";
  }

  return "watch";
}

function buildWeatherHeadline(eventTitle: string, severity: WeatherAlertSeverity) {
  if (severity === "cancel_risk") return `Weather cancellation risk for ${eventTitle}`;
  if (severity === "delay") return `Weather delay watch for ${eventTitle}`;
  return `Weather watch for ${eventTitle}`;
}

function buildWeatherDetail(input: WeatherNormalizationInput) {
  const parts = [
    input.shortForecast || input.description,
    formatTemperature(input.temperatureF),
    formatPrecipitation(input.precipitationProbability),
    formatWind(input.windSpeedMph),
    formatThunderstorm(input.thunderstormProbability)
  ].filter(Boolean);

  const location = input.locationName || input.locationAddress;
  const locationDetail = location ? ` for ${location}` : "";
  const summary = parts.length > 0 ? parts.join(", ") : "forecast details unavailable";

  return `${input.providerName} forecast${locationDetail}: ${summary}.`;
}

function formatTemperature(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return `${Math.round(value)}F`;
}

function formatPrecipitation(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return `${Math.round(value)}% precipitation chance`;
}

function formatWind(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return `${Math.round(value)} mph wind`;
}

function formatThunderstorm(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return `${Math.round(value)}% thunderstorm chance`;
}
