import type { LeagueEvent } from "./types";

export function getEmbeddedMapUi(event?: LeagueEvent) {
  if (!event) return { title: "Embedded map unavailable", embedUrl: "", directionsUrl: "", status: "missing" as const };
  const query = encodeURIComponent(`${event.locationName} ${event.locationAddress}`);
  return {
    title: `Embedded map for ${event.locationName}`,
    embedUrl: `https://www.google.com/maps?q=${query}&output=embed`,
    directionsUrl: `https://www.google.com/maps/search/?api=1&query=${query}`,
    status: "ready" as const
  };
}

export function getVenueMarkers(events: LeagueEvent[]) {
  return events.map((event, index) => ({
    id: `marker-${event.id}`,
    label: `${index + 1}`,
    title: event.locationName,
    eventTitle: event.title,
    address: event.locationAddress
  }));
}

export function getMapQuotaStatus(input: { requestsToday: number; dailyLimit: number }) {
  const remaining = Math.max(input.dailyLimit - input.requestsToday, 0);
  return {
    remaining,
    status: remaining > 25 ? "ok" as const : remaining > 0 ? "warning" as const : "danger" as const,
    detail: `${remaining} map request(s) remain today before fallback links should be used.`
  };
}

export function getFieldLayoutMetadata(event?: LeagueEvent) {
  return {
    fieldName: event?.locationName ?? "Field pending",
    entrance: "Main gate near concessions",
    homeBench: "First-base side",
    awayBench: "Third-base side",
    warmupArea: "Outfield grass beyond the foul line"
  };
}
