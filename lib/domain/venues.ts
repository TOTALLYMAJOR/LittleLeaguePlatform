import type { LeagueEvent } from "./types";

export interface ManagedVenueMetadata {
  id?: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  mapUrl?: string;
  mapEmbedUrl?: string;
  fieldLabel?: string;
  notes?: string;
  status?: "active" | "inactive";
}

function eventVenueKey(event: LeagueEvent) {
  return `${event.locationName.trim().toLowerCase()}|${event.locationAddress.trim().toLowerCase()}`;
}

function managedVenueKey(venue: Pick<ManagedVenueMetadata, "name" | "address">) {
  return `${venue.name.trim().toLowerCase()}|${venue.address.trim().toLowerCase()}`;
}

function googleMapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function approvedGoogleMapsHost(hostname: string) {
  return new Set(["www.google.com", "google.com", "maps.google.com", "maps.app.goo.gl"]).has(hostname.toLowerCase());
}

export function isApprovedGoogleMapsUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !approvedGoogleMapsHost(url.hostname)) return false;
    if (url.hostname.toLowerCase() === "maps.app.goo.gl") return true;
    return url.pathname.startsWith("/maps");
  } catch {
    return false;
  }
}

export function isApprovedGoogleMapsEmbedUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["www.google.com", "google.com"].includes(url.hostname.toLowerCase())) return false;
    return url.pathname.startsWith("/maps/embed") || (url.pathname.startsWith("/maps") && url.searchParams.get("output") === "embed");
  } catch {
    return false;
  }
}

export function validateVenueMetadata(input: ManagedVenueMetadata) {
  if (!input.name.trim() || !input.address.trim()) {
    return { ok: false, message: "Venue metadata requires a name and address." };
  }

  const hasLatitude = input.latitude !== undefined;
  const hasLongitude = input.longitude !== undefined;
  if (hasLatitude !== hasLongitude) {
    return { ok: false, message: "Venue coordinates require both latitude and longitude." };
  }
  if (hasLatitude && hasLongitude) {
    const latitude = Number(input.latitude);
    const longitude = Number(input.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return { ok: false, message: "Venue coordinates must be valid latitude and longitude values." };
    }
  }
  if (input.mapUrl && !isApprovedGoogleMapsUrl(input.mapUrl)) {
    return { ok: false, message: "Venue map links must use an approved Google Maps HTTPS URL." };
  }
  if (input.mapEmbedUrl && !isApprovedGoogleMapsEmbedUrl(input.mapEmbedUrl)) {
    return { ok: false, message: "Venue embed URLs must use approved Google Maps embed metadata." };
  }
  if (input.status && !["active", "inactive"].includes(input.status)) {
    return { ok: false, message: "Venue status must be active or inactive." };
  }

  return { ok: true, message: "Venue metadata is valid." };
}

function findManagedVenue(event: LeagueEvent | undefined, venues: ManagedVenueMetadata[]) {
  if (!event) return undefined;
  const key = eventVenueKey(event);
  return venues.find((venue) => venue.status !== "inactive" && managedVenueKey(venue) === key);
}

export function getEmbeddedMapUi(event?: LeagueEvent, venues: ManagedVenueMetadata[] = []) {
  if (!event) {
    return {
      title: "Embedded map unavailable",
    embedUrl: "",
    directionsUrl: "",
    status: "missing" as const,
    boundary: "Select an event before showing map metadata. No route tracking is enabled."
    };
  }
  const venue = findManagedVenue(event, venues);
  const query = encodeURIComponent(`${event.locationName} ${event.locationAddress}`);
  const approvedEmbedUrl = isApprovedGoogleMapsEmbedUrl(venue?.mapEmbedUrl) ? venue?.mapEmbedUrl ?? "" : "";
  const directionsUrl = isApprovedGoogleMapsUrl(venue?.mapUrl)
    ? venue?.mapUrl ?? ""
    : googleMapsSearchUrl(`${event.locationName} ${event.locationAddress}`);
  return {
    title: venue?.fieldLabel ? `Embedded map for ${venue.name} - ${venue.fieldLabel}` : `Embedded map for ${event.locationName}`,
    embedUrl: approvedEmbedUrl,
    directionsUrl,
    status: approvedEmbedUrl ? "ready" as const : "fallback" as const,
    boundary: approvedEmbedUrl
      ? "Using approved managed venue embed metadata; no route tracking is claimed."
      : `Embed withheld until approved venue metadata exists for ${event.locationName}; use the directions fallback. No route tracking is enabled.`
  };
}

export function getVenueMarkers(events: LeagueEvent[], venues: ManagedVenueMetadata[] = []) {
  return events.map((event, index) => ({
    id: `marker-${event.id}`,
    label: findManagedVenue(event, venues)?.fieldLabel ?? `${index + 1}`,
    title: event.locationName,
    eventTitle: event.title,
    address: event.locationAddress,
    latitude: findManagedVenue(event, venues)?.latitude,
    longitude: findManagedVenue(event, venues)?.longitude,
    metadataStatus: findManagedVenue(event, venues) ? "managed" as const : "event_fallback" as const
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

export function getFieldLayoutMetadata(event?: LeagueEvent, venues: ManagedVenueMetadata[] = []) {
  const venue = findManagedVenue(event, venues);
  return {
    fieldName: venue?.fieldLabel ?? event?.locationName ?? "Field pending",
    entrance: "Main gate near concessions",
    homeBench: "First-base side",
    awayBench: "Third-base side",
    warmupArea: "Outfield grass beyond the foul line",
    notes: venue?.notes ?? "No managed venue notes are saved yet."
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
    href: input.directionsUrl,
    trackingBoundary: "Opening a map link does not enable route tracking."
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

export function getFacilityNotes(event?: LeagueEvent) {
  return {
    title: event ? `${event.locationName} facility notes` : "Facility notes pending",
    notes: [
      "Keep walkways clear for younger players and strollers.",
      "Report locked gates, lighting issues, or unsafe surfaces to league staff.",
      "Use team chat for arrival questions, not emergency instructions."
    ]
  };
}
