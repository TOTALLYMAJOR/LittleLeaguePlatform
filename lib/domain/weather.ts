import type { AppState } from "./types";

export function getWeatherApprovalQueue(state: AppState) {
  return state.weatherAlerts
    .filter((alert) => alert.status === "draft")
    .map((alert) => ({
      alert,
      event: state.events.find((event) => event.id === alert.eventId),
      team: state.teams.find((team) => team.id === alert.teamId),
      approvalStatus: "needs_review" as const
    }));
}

export function getWeatherProviderRetryLogs(state: AppState) {
  return state.weatherAlerts
    .filter((alert) => alert.severity === "cancel_risk")
    .map((alert) => ({
      alert,
      provider: "tomorrow.io",
      nextRetryAt: new Date(new Date(alert.createdAt).getTime() + 10 * 60 * 1000).toISOString(),
      reason: "High-risk weather should refresh before approval."
    }));
}

export function getWeatherAlertHistory(state: AppState) {
  return [...state.weatherAlerts]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .map((alert) => ({
      alert,
      eventTitle: state.events.find((event) => event.id === alert.eventId)?.title ?? "Event"
    }));
}

export function getSportWeatherThresholds(sport: "baseball" | "soccer" | "football" | "generic" = "baseball") {
  const thresholds = {
    baseball: { heatIndex: 95, lightningMiles: 10, rainInchesPerHour: 0.25, airQualityIndex: 125 },
    soccer: { heatIndex: 92, lightningMiles: 10, rainInchesPerHour: 0.35, airQualityIndex: 125 },
    football: { heatIndex: 98, lightningMiles: 10, rainInchesPerHour: 0.5, airQualityIndex: 150 },
    generic: { heatIndex: 95, lightningMiles: 10, rainInchesPerHour: 0.3, airQualityIndex: 125 }
  }[sport];

  return {
    sport,
    thresholds,
    detail: `${sport} threshold policy: heat ${thresholds.heatIndex}, lightning ${thresholds.lightningMiles} miles, rain ${thresholds.rainInchesPerHour}/hr, AQI ${thresholds.airQualityIndex}.`
  };
}

export function getLeagueWeatherThresholds(division: string) {
  const youngDivision = ["3U", "4U", "5U", "6U"].includes(division);
  return {
    division,
    heatIndex: youngDivision ? 90 : 95,
    lightningMiles: 10,
    airQualityIndex: youngDivision ? 100 : 125,
    detail: `${division} league policy uses ${youngDivision ? "younger-player" : "standard"} weather thresholds.`
  };
}

export function evaluateWeatherThresholds(input: {
  heatIndex: number;
  lightningMiles: number;
  airQualityIndex: number;
  thresholds?: { heatIndex: number; lightningMiles: number; airQualityIndex: number };
}) {
  const thresholds = input.thresholds ?? getSportWeatherThresholds("baseball").thresholds;
  return {
    heat: input.heatIndex >= thresholds.heatIndex ? "review" : "ok",
    lightning: input.lightningMiles <= thresholds.lightningMiles ? "review" : "ok",
    airQuality: input.airQualityIndex >= thresholds.airQualityIndex ? "review" : "ok"
  };
}
