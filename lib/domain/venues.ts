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

export function getVenuePage(event?: LeagueEvent) {
  const slug = event?.locationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "venue-pending";
  return {
    title: event ? `${event.locationName} venue page` : "Venue page pending",
    path: `/venues/${slug}`,
    summary: event ? `${event.locationName} at ${event.locationAddress}` : "No venue event selected."
  };
}

export function getVenueAmenityNotes(event?: LeagueEvent) {
  return {
    parking: event ? `Use the main lot closest to ${event.locationName}; overflow parking stays by the league entrance.` : "Parking note pending.",
    entrance: "Enter through the main gate near concessions unless a coach posts an alternate entrance.",
    restrooms: "Restrooms are beside concessions; portable restrooms are fallback if the building is closed."
  };
}

export function getArrivalInstructions(event?: LeagueEvent) {
  return event
    ? `Arrive 20 minutes before ${event.title}, park near ${event.locationName}, and meet by the main entrance.`
    : "Arrival instructions will appear after an event location is selected.";
}

export function getVenueIntelligence(event?: LeagueEvent) {
  return {
    confidence: event ? "ready" as const : "missing" as const,
    summary: event
      ? `${event.locationName} has map, arrival, layout, parking, entrance, and restroom context.`
      : "Venue intelligence needs an event location."
  };
}

export function getMapFallbackUx(input: { quotaStatus: "ok" | "warning" | "danger"; directionsUrl: string }) {
  return {
    useFallback: input.quotaStatus === "danger",
    label: input.quotaStatus === "danger" ? "Use directions link fallback" : "Embedded map available",
    href: input.directionsUrl
  };
}

export function highlightLocationChange(previousLocation: string, nextLocation: string) {
  return {
    changed: previousLocation.trim().toLowerCase() !== nextLocation.trim().toLowerCase(),
    message: previousLocation.trim().toLowerCase() !== nextLocation.trim().toLowerCase()
      ? `Location changed from ${previousLocation} to ${nextLocation}.`
      : "Location unchanged."
  };
}
