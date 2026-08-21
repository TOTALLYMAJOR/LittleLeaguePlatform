import { seedState, validateVenueMetadata, type EventStatus, type EventType, type LeagueEvent, type Team } from "@/lib/domain";
import { requireActiveTeamCoachOrOrgAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { getTeamSeasonStatus, isCurrentTeamRow, type TeamLifecycleRow } from "./team-lifecycle";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Schedule operations span staged tables; keep dynamic until generated types
  // are refreshed for every migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export interface ScheduleOperationsData {
  organizationId: string;
  isSupabaseBacked: boolean;
  message: string;
  teams: Team[];
  events: LeagueEvent[];
  fieldLocations: Array<{
    id: string;
    organizationId: string;
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
    googlePlaceId?: string;
    mapUrl?: string;
    mapEmbedUrl?: string;
    fieldLabel?: string;
    notes?: string;
    status: "active" | "inactive";
  }>;
}

export interface ScheduleVenueInput {
  id?: string;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  mapUrl?: string;
  mapEmbedUrl?: string;
  fieldLabel?: string;
  notes?: string;
  status?: "active" | "inactive";
}

export interface ScheduleRecurrenceInput {
  frequency: "weekly";
  count: number;
  intervalWeeks?: number;
  until?: string;
}

export type RecurrenceEditScope = "single" | "this_and_future" | "all";

export interface SaveScheduleEventResult {
  ok: boolean;
  message: string;
  conflicts?: Array<ScheduleConflictCandidate & {
    occurrence: ScheduleOccurrence;
    reasons: string[];
  }>;
  event?: LeagueEvent;
  events?: LeagueEvent[];
  eventSeriesId?: string;
  recurrenceCount?: number;
  notificationCount?: number;
}

export interface SaveScheduleEventInput {
  actorUserId: string;
  eventId?: string;
  organizationId: string;
  seasonId: string;
  teamId: string;
  title: string;
  eventType: EventType;
  startsAt: string;
  endsAt: string;
  locationName: string;
  locationAddress: string;
  fieldLocationId?: string;
  venue?: ScheduleVenueInput;
  opponent?: string;
  status: EventStatus;
  reason?: string;
  recurrence?: ScheduleRecurrenceInput;
  recurrenceEditScope?: RecurrenceEditScope;
}

interface ScheduleConflictCandidate {
  id: string;
  title: string;
  team_id: string;
  field_location_id?: string | null;
  location_name: string | null;
  location_address?: string | null;
  starts_at: string;
  ends_at: string;
  status: EventStatus;
}

interface ScheduleOccurrence {
  startsAt: string;
  endsAt: string;
  instanceIndex: number;
}

function adminDb() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

function fallbackScheduleOperationsData(organizationIds?: string[]): ScheduleOperationsData {
  const teams = organizationIds
    ? seedState.teams.filter((team) => organizationIds.includes(team.organizationId))
    : seedState.teams;
  const teamIds = new Set(teams.map((team) => team.id));
  return {
    organizationId: organizationIds?.[0] ?? seedState.organization.id,
    isSupabaseBacked: false,
    message: "Showing local schedule fallback until Supabase schedule rows are available.",
    teams,
    events: seedState.events.filter((event) => teamIds.has(event.teamId)),
    fieldLocations: []
  };
}

function mapEvent(row: {
  id: string;
  organization_id: string;
  team_id: string;
  season_id: string;
  title: string;
  event_type: EventType;
  starts_at: string;
  ends_at: string;
  location_name: string | null;
  location_address: string | null;
  opponent: string | null;
  status: EventStatus;
  schedule_version?: number | null;
  created_at: string;
  updated_at: string;
}): LeagueEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    teamId: row.team_id,
    seasonId: row.season_id,
    title: row.title,
    eventType: row.event_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    locationName: row.location_name ?? "Field pending",
    locationAddress: row.location_address ?? "",
    opponent: row.opponent ?? undefined,
    status: row.status,
    scheduleVersion: row.schedule_version ?? 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function overlaps(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  return new Date(leftStart).getTime() < new Date(rightEnd).getTime() &&
    new Date(leftEnd).getTime() > new Date(rightStart).getTime();
}

function googleMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function googleMapsEmbedUrl(address: string) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(address)}`;
}

function normalizeVenueKey(name: string | null | undefined, address: string | null | undefined) {
  return `${(name ?? "").trim().toLowerCase()}|${(address ?? "").trim().toLowerCase()}`;
}

function boundedRecurrence(input?: ScheduleRecurrenceInput) {
  if (!input) return undefined;
  if (input.frequency !== "weekly") return undefined;
  const count = Math.max(1, Math.min(Math.trunc(input.count || 1), 26));
  const intervalWeeks = Math.max(1, Math.min(Math.trunc(input.intervalWeeks || 1), 8));
  return { ...input, count, intervalWeeks };
}

export function buildRecurringScheduleOccurrences(input: {
  startsAt: string;
  endsAt: string;
  recurrence?: ScheduleRecurrenceInput;
}): ScheduleOccurrence[] {
  const startMs = Date.parse(input.startsAt);
  const endMs = Date.parse(input.endsAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return [];

  const recurrence = boundedRecurrence(input.recurrence);
  const count = recurrence?.count ?? 1;
  const intervalMs = (recurrence?.intervalWeeks ?? 1) * 7 * 24 * 60 * 60 * 1000;
  const untilMs = recurrence?.until ? Date.parse(recurrence.until) : Number.POSITIVE_INFINITY;
  const durationMs = endMs - startMs;

  return Array.from({ length: count }, (_, index) => {
    const occurrenceStartMs = startMs + intervalMs * index;
    return {
      startsAt: new Date(occurrenceStartMs).toISOString(),
      endsAt: new Date(occurrenceStartMs + durationMs).toISOString(),
      instanceIndex: index
    };
  }).filter((occurrence) => Date.parse(occurrence.startsAt) <= untilMs);
}

export function findScheduleConflicts(input: {
  occurrences: ScheduleOccurrence[];
  existingEvents: ScheduleConflictCandidate[];
  teamId: string;
  fieldLocationId?: string | null;
  locationName: string;
  locationAddress: string;
  excludedEventIds?: string[];
}) {
  const excluded = new Set(input.excludedEventIds ?? []);
  const requestedVenueKey = normalizeVenueKey(input.locationName, input.locationAddress);

  return input.occurrences.flatMap((occurrence) => input.existingEvents
    .filter((event) => !excluded.has(event.id) && event.status === "scheduled")
    .filter((event) => overlaps(occurrence.startsAt, occurrence.endsAt, event.starts_at, event.ends_at))
    .flatMap((event) => {
      const reasons = [
        event.team_id === input.teamId ? "team overlap" : "",
        input.fieldLocationId && event.field_location_id === input.fieldLocationId ? "venue overlap" : "",
        normalizeVenueKey(event.location_name, event.location_address) === requestedVenueKey ? "venue overlap" : ""
      ].filter(Boolean);
      const uniqueReasons = Array.from(new Set(reasons));
      return uniqueReasons.length ? [{ ...event, occurrence, reasons: uniqueReasons }] : [];
    }));
}

export function exportScheduleIcs(events: LeagueEvent[], teamId: string) {
  const filtered = events
    .filter((event) => event.teamId === teamId)
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Little League HQ//Schedule//EN"
  ];

  filtered.forEach((event) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@little-league-hq.local`,
      `SUMMARY:${event.title}`,
      `DTSTART:${event.startsAt.replace(/[-:]/g, "").replace(".000", "")}`,
      `DTEND:${event.endsAt.replace(/[-:]/g, "").replace(".000", "")}`,
      `LOCATION:${event.locationName}`,
      `STATUS:${event.status.toUpperCase()}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\n");
}

export async function listScheduleOperationsData(input: {
  organizationIds: string[];
}): Promise<ScheduleOperationsData> {
  const organizationIds = [...new Set(input.organizationIds.map((id) => id.trim()).filter(Boolean))];
  if (!organizationIds.length) return fallbackScheduleOperationsData([]);

  try {
    const db = adminDb();
    const [
      { data: organizations },
      { data: teams },
      { data: events },
      { data: fieldLocations }
    ] = await withSupabaseTimeout(Promise.all([
      db.from("organizations").select("id,name").in("id", organizationIds).limit(1),
      db.from("teams").select("id,organization_id,season_id,division,name,coach_user_id,mascot,primary_color,secondary_color,theme_key,status,seasons(status)").in("organization_id", organizationIds).order("division", { ascending: true }).order("name", { ascending: true }),
      db.from("events").select("*").in("organization_id", organizationIds).order("starts_at", { ascending: true }),
      db.from("field_locations").select("id,organization_id,name,address,latitude,longitude,google_place_id,map_url,map_embed_url,field_label,notes,status").in("organization_id", organizationIds).order("name", { ascending: true })
    ]), 7000) as [
      { data: Array<{ id: string; name: string }> | null },
      { data: Array<{ id: string; organization_id: string; season_id: string; division: string; name: string; coach_user_id: string | null; mascot: string; primary_color: string; secondary_color: string; theme_key: Team["themeKey"]; status: "active" | "archived"; seasons: TeamLifecycleRow["seasons"] }> | null },
      { data: Array<Parameters<typeof mapEvent>[0]> | null },
      { data: Array<{ id: string; organization_id: string; name: string; address: string; latitude: number | null; longitude: number | null; google_place_id: string | null; map_url: string | null; map_embed_url: string | null; field_label: string | null; notes: string | null; status: "active" | "inactive" }> | null }
    ];

    const organization = organizations?.[0];
    if (!organization || !teams?.length) return fallbackScheduleOperationsData(organizationIds);

    return {
      organizationId: organization.id,
      isSupabaseBacked: true,
      message: "Showing Supabase schedule, venue, and calendar records.",
      teams: teams.map((team) => ({
        id: team.id,
        organizationId: team.organization_id,
        seasonId: team.season_id,
        division: team.division,
        name: team.name,
        coachUserId: team.coach_user_id ?? undefined,
        mascot: team.mascot,
        primaryColor: team.primary_color,
        secondaryColor: team.secondary_color,
        themeKey: team.theme_key,
        status: team.status,
        seasonStatus: getTeamSeasonStatus(team)
      })),
      events: (events ?? []).map(mapEvent),
      fieldLocations: (fieldLocations ?? []).map((field) => ({
        id: field.id,
        organizationId: field.organization_id,
        name: field.name,
        address: field.address,
        latitude: field.latitude ?? undefined,
        longitude: field.longitude ?? undefined,
        googlePlaceId: field.google_place_id ?? undefined,
        mapUrl: field.map_url ?? undefined,
        mapEmbedUrl: field.map_embed_url ?? undefined,
        fieldLabel: field.field_label ?? undefined,
        notes: field.notes ?? undefined,
        status: field.status
      }))
    };
  } catch {
    return fallbackScheduleOperationsData(organizationIds);
  }
}

export async function listPublicScheduleOperationsData(): Promise<ScheduleOperationsData> {
  try {
    const db = adminDb();
    const configuredOrganizationId = (
      process.env.PUBLIC_ORGANIZATION_ID
      ?? process.env.PUBLIC_SCHEDULE_ORGANIZATION_ID
    )?.trim();
    let organizationQuery = db.from("organizations").select("id,name,created_at");
    organizationQuery = configuredOrganizationId
      ? organizationQuery.eq("id", configuredOrganizationId)
      : organizationQuery.order("created_at", { ascending: true });
    const { data: organizations } = await withSupabaseTimeout(organizationQuery.limit(1), 7000) as {
      data: Array<{ id: string; name: string; created_at: string }> | null;
    };
    const organization = organizations?.[0];
    if (!organization) return fallbackScheduleOperationsData();

    const [{ data: teamRows }, { data: fieldLocations }] = await withSupabaseTimeout(Promise.all([
      db
        .from("teams")
        .select("id,organization_id,season_id,division,name,coach_user_id,mascot,primary_color,secondary_color,theme_key,status,seasons(status)")
        .eq("organization_id", organization.id)
        .order("division", { ascending: true })
        .order("name", { ascending: true }),
      db
        .from("field_locations")
        .select("id,organization_id,name,address,latitude,longitude,google_place_id,map_url,map_embed_url,field_label,notes,status")
        .eq("organization_id", organization.id)
        .eq("status", "active")
        .order("name", { ascending: true })
    ]), 7000) as [
      {
        data: Array<{
          id: string;
          organization_id: string;
          season_id: string;
          division: string;
          name: string;
          coach_user_id: string | null;
          mascot: string;
          primary_color: string;
          secondary_color: string;
          theme_key: Team["themeKey"];
          status: "active" | "archived";
          seasons: TeamLifecycleRow["seasons"];
        }> | null;
      },
      {
        data: Array<{
          id: string;
          organization_id: string;
          name: string;
          address: string;
          latitude: number | null;
          longitude: number | null;
          google_place_id: string | null;
          map_url: string | null;
          map_embed_url: string | null;
          field_label: string | null;
          notes: string | null;
          status: "active" | "inactive";
        }> | null;
      }
    ];
    const currentTeams = (teamRows ?? []).filter(isCurrentTeamRow);
    const currentTeamIds = currentTeams.map((team) => team.id);
    const { data: events } = currentTeamIds.length
      ? await withSupabaseTimeout(db
        .from("events")
        .select("*")
        .eq("organization_id", organization.id)
        .in("team_id", currentTeamIds)
        .order("starts_at", { ascending: true }), 7000) as { data: Array<Parameters<typeof mapEvent>[0]> | null }
      : { data: [] as Array<Parameters<typeof mapEvent>[0]> };

    return {
      organizationId: organization.id,
      isSupabaseBacked: true,
      message: "Showing the current public schedule for one league organization.",
      teams: currentTeams.map((team) => ({
        id: team.id,
        organizationId: team.organization_id,
        seasonId: team.season_id,
        division: team.division,
        name: team.name,
        coachUserId: team.coach_user_id ?? undefined,
        mascot: team.mascot,
        primaryColor: team.primary_color,
        secondaryColor: team.secondary_color,
        themeKey: team.theme_key,
        status: team.status,
        seasonStatus: getTeamSeasonStatus(team)
      })),
      events: (events ?? []).map(mapEvent),
      fieldLocations: (fieldLocations ?? []).map((field) => ({
        id: field.id,
        organizationId: field.organization_id,
        name: field.name,
        address: field.address,
        latitude: field.latitude ?? undefined,
        longitude: field.longitude ?? undefined,
        googlePlaceId: field.google_place_id ?? undefined,
        mapUrl: field.map_url ?? undefined,
        mapEmbedUrl: field.map_embed_url ?? undefined,
        fieldLabel: field.field_label ?? undefined,
        notes: field.notes ?? undefined,
        status: field.status
      }))
    };
  } catch {
    return fallbackScheduleOperationsData();
  }
}

export async function saveScheduleEvent(input: SaveScheduleEventInput): Promise<SaveScheduleEventResult> {
  const title = input.title.trim();
  const locationName = input.locationName.trim();
  const locationAddress = input.locationAddress.trim();
  if (!input.actorUserId || !input.organizationId || !input.seasonId || !input.teamId || !title || !locationName || !locationAddress) {
    return { ok: false, message: "Schedule event requires actor, organization, season, team, title, and location." };
  }
  if (Date.parse(input.endsAt) <= Date.parse(input.startsAt)) {
    return { ok: false, message: "Schedule event end must be after start." };
  }

  try {
    const db = adminDb();
    const access = await requireActiveTeamCoachOrOrgAdmin({
      db,
      teamId: input.teamId,
      userId: input.actorUserId,
      action: "manage schedule events"
    });
    if (!access.ok || !access.team) return { ok: false, message: access.message };

    const { data: season } = await withSupabaseTimeout(db
      .from("seasons")
      .select("id,status")
      .eq("id", input.seasonId)
      .single(), 7000) as { data: { id: string; status: "active" | "archived" } | null };
    if (!season || season.status === "archived") {
      return { ok: false, message: "Archived seasons are read-only for schedule changes." };
    }

    let resolvedFieldLocationId = input.fieldLocationId ?? input.venue?.id ?? "";
    let resolvedLocationName = input.venue?.name?.trim() || locationName;
    let resolvedLocationAddress = input.venue?.address?.trim() || locationAddress;
    if (input.venue) {
      const venueValidation = validateVenueMetadata({
        name: resolvedLocationName,
        address: resolvedLocationAddress,
        latitude: input.venue.latitude,
        longitude: input.venue.longitude,
        googlePlaceId: input.venue.googlePlaceId,
        mapUrl: input.venue.mapUrl,
        mapEmbedUrl: input.venue.mapEmbedUrl,
        fieldLabel: input.venue.fieldLabel,
        notes: input.venue.notes,
        status: input.venue.status
      });
      if (!venueValidation.ok) return { ok: false, message: venueValidation.message };
    }

    if (input.venue || !resolvedFieldLocationId) {
      const venue = input.venue ?? {};
      const { data: fieldLocation, error: fieldError } = await withSupabaseTimeout(db
        .from("field_locations")
        .upsert({
          ...(resolvedFieldLocationId ? { id: resolvedFieldLocationId } : {}),
          organization_id: input.organizationId,
          name: resolvedLocationName,
          address: resolvedLocationAddress,
          latitude: Number.isFinite(venue.latitude) ? venue.latitude : null,
          longitude: Number.isFinite(venue.longitude) ? venue.longitude : null,
          google_place_id: venue.googlePlaceId?.trim() || null,
          map_url: venue.mapUrl?.trim() || googleMapsUrl(resolvedLocationAddress),
          map_embed_url: venue.mapEmbedUrl?.trim() || googleMapsEmbedUrl(resolvedLocationAddress),
          field_label: venue.fieldLabel?.trim() || null,
          notes: venue.notes?.trim() || null,
          status: venue.status ?? "active"
        }, { onConflict: "organization_id,name" })
        .select("id,name,address")
        .single(), 7000) as {
          data: { id: string; name: string; address: string } | null;
          error: { message?: string } | null;
        };

      if (fieldError || !fieldLocation) {
        return { ok: false, message: "Venue record could not be saved for this schedule event." };
      }
      resolvedFieldLocationId = fieldLocation.id;
      resolvedLocationName = fieldLocation.name;
      resolvedLocationAddress = fieldLocation.address;
    } else if (resolvedFieldLocationId) {
      const { data: fieldLocation, error: fieldError } = await withSupabaseTimeout(db
        .from("field_locations")
        .select("id,organization_id,name,address,status")
        .eq("id", resolvedFieldLocationId)
        .eq("organization_id", input.organizationId)
        .single(), 7000) as {
          data: { id: string; organization_id: string; name: string; address: string; status: "active" | "inactive" } | null;
          error: { message?: string } | null;
        };

      if (fieldError || !fieldLocation || fieldLocation.status !== "active") {
        return { ok: false, message: "Schedule event requires an active venue record for the selected field." };
      }
      resolvedLocationName = fieldLocation.name;
      resolvedLocationAddress = fieldLocation.address;
    }

    const beforeResult = input.eventId
      ? await withSupabaseTimeout(db.from("events").select("*").eq("id", input.eventId).maybeSingle(), 7000) as { data: Record<string, unknown> | null }
      : { data: null };

    if (input.eventId && !beforeResult.data) return { ok: false, message: "Schedule event could not be found." };

    const baseOccurrences = buildRecurringScheduleOccurrences({
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      recurrence: input.eventId ? undefined : input.recurrence
    });
    if (!baseOccurrences.length) return { ok: false, message: "Schedule event recurrence could not be expanded." };

    let eventSeriesId = typeof beforeResult.data?.event_series_id === "string" ? beforeResult.data.event_series_id : "";
    let targetEvents: Array<{ id?: string; before?: Record<string, unknown> | null; occurrence: ScheduleOccurrence }> = baseOccurrences.map((occurrence) => ({
      id: input.eventId,
      before: beforeResult.data,
      occurrence
    }));

    if (input.eventId && beforeResult.data && eventSeriesId && input.recurrenceEditScope && input.recurrenceEditScope !== "single") {
      const sourceEvent = beforeResult.data;
      const { data: seriesEvents } = await withSupabaseTimeout(db
        .from("events")
        .select("*")
        .eq("event_series_id", eventSeriesId)
        .order("starts_at", { ascending: true }), 7000) as { data: Array<Record<string, unknown>> | null };
      const sourceStartsAt = Date.parse(String(sourceEvent.starts_at));
      const shiftedStartMs = Date.parse(input.startsAt);
      const shiftMs = shiftedStartMs - sourceStartsAt;
      const durationMs = Date.parse(input.endsAt) - shiftedStartMs;
      const scopedEvents = (seriesEvents ?? []).filter((event) => (
        input.recurrenceEditScope === "all" ||
        Date.parse(String(event.starts_at)) >= sourceStartsAt
      ));

      targetEvents = scopedEvents.map((event, index) => {
        const nextStartMs = Date.parse(String(event.starts_at)) + shiftMs;
        return {
          id: String(event.id),
          before: event,
          occurrence: {
            startsAt: new Date(nextStartMs).toISOString(),
            endsAt: new Date(nextStartMs + durationMs).toISOString(),
            instanceIndex: typeof event.recurrence_instance_index === "number" ? event.recurrence_instance_index : index
          }
        };
      });
    }

    const { data: existingEvents } = await withSupabaseTimeout(db
      .from("events")
      .select("id,title,team_id,field_location_id,location_name,location_address,starts_at,ends_at,status")
      .eq("organization_id", input.organizationId), 7000) as {
        data: ScheduleConflictCandidate[] | null;
      };

    const excludedEventIds = targetEvents.map((event) => event.id).filter(Boolean) as string[];
    const conflicts = findScheduleConflicts({
      occurrences: targetEvents.map((event) => event.occurrence),
      existingEvents: existingEvents ?? [],
      teamId: input.teamId,
      fieldLocationId: resolvedFieldLocationId || null,
      locationName: resolvedLocationName,
      locationAddress: resolvedLocationAddress,
      excludedEventIds
    });

    if (conflicts.length) {
      return {
        ok: false,
        message: `${conflicts.length} schedule conflict(s) must be resolved before saving this event.`,
        conflicts
      };
    }

    let createdEventSeries = false;
    if (!input.eventId && baseOccurrences.length > 1) {
      const recurrence = boundedRecurrence(input.recurrence);
      const recurrenceRule = `FREQ=WEEKLY;INTERVAL=${recurrence?.intervalWeeks ?? 1};COUNT=${baseOccurrences.length}`;
      const { data: series, error: seriesError } = await withSupabaseTimeout(db
        .from("event_series")
        .insert({
          organization_id: input.organizationId,
          team_id: input.teamId,
          season_id: input.seasonId,
          title,
          event_type: input.eventType,
          recurrence_rule: recurrenceRule,
          starts_at: input.startsAt,
          ends_at: input.endsAt,
          field_location_id: resolvedFieldLocationId || null,
          location_name: resolvedLocationName,
          location_address: resolvedLocationAddress,
          opponent: input.opponent?.trim() || null,
          created_by_user_id: input.actorUserId,
          metadata_json: {
            recurrenceCount: baseOccurrences.length,
            recurrenceEndsAt: baseOccurrences.at(-1)?.endsAt
          }
        })
        .select("id")
        .single(), 7000) as { data: { id: string } | null; error: { message?: string } | null };

      if (seriesError || !series) return { ok: false, message: "Recurring event series could not be saved." };
      eventSeriesId = series.id;
      createdEventSeries = true;
    } else if (eventSeriesId && input.recurrenceEditScope && input.recurrenceEditScope !== "single") {
      const { error: seriesError } = await withSupabaseTimeout(db
        .from("event_series")
        .update({
          title,
          event_type: input.eventType,
          field_location_id: resolvedFieldLocationId || null,
          location_name: resolvedLocationName,
          location_address: resolvedLocationAddress,
          opponent: input.opponent?.trim() || null
        })
        .eq("id", eventSeriesId), 7000) as { error: { message?: string } | null };
      if (seriesError) return { ok: false, message: "Recurring event series could not be updated." };
    }

    const changeType = !input.eventId
      ? "created"
      : input.status === "cancelled"
        ? "cancelled"
        : input.status === "completed"
          ? "completed"
          : beforeResult.data?.status === "cancelled" && input.status === "scheduled"
            ? "restored"
            : beforeResult.data?.location_name !== resolvedLocationName || beforeResult.data?.field_location_id !== resolvedFieldLocationId
              ? "location_changed"
              : "time_changed";

    const eventPayloads = targetEvents.map((target) => ({
      ...(target.id ? { id: target.id } : {}),
      organization_id: input.organizationId,
      season_id: input.seasonId,
      team_id: input.teamId,
      title,
      event_type: input.eventType,
      starts_at: target.occurrence.startsAt,
      ends_at: target.occurrence.endsAt,
      location_name: resolvedLocationName,
      location_address: resolvedLocationAddress,
      field_location_id: resolvedFieldLocationId || null,
      event_series_id: eventSeriesId || null,
      recurrence_instance_index: eventSeriesId ? target.occurrence.instanceIndex : null,
      opponent: input.opponent?.trim() || null,
      status: input.status,
      cancelled_reason: input.status === "cancelled" ? input.reason?.trim() || "Cancelled by staff." : null,
      schedule_version: (typeof target.before?.schedule_version === "number" ? target.before.schedule_version : 0) + 1
    }));

    const { data: savedEvents, error } = await withSupabaseTimeout(db
      .from("events")
      .upsert(eventPayloads)
      .select("id,organization_id,team_id,season_id,title,event_type,starts_at,ends_at,location_name,location_address,opponent,status,schedule_version,created_at,updated_at")
      .order("starts_at", { ascending: true }), 7000) as {
        data: Array<Parameters<typeof mapEvent>[0]> | null;
        error: { message?: string } | null;
      };

    if (error || !savedEvents?.length) {
      if (createdEventSeries) {
        await withSupabaseTimeout(db.from("event_series").delete().eq("id", eventSeriesId), 7000);
      }
      return { ok: false, message: "Schedule event could not be saved." };
    }

    const changeLogs = savedEvents.map((event, index) => ({
      event_id: event.id,
      organization_id: input.organizationId,
      team_id: input.teamId,
      actor_user_id: input.actorUserId,
      change_type: changeType,
      before_json: targetEvents[index]?.before ?? null,
      after_json: event,
      reason: input.reason?.trim() || null
    }));
    await withSupabaseTimeout(db.from("event_change_logs").insert(changeLogs), 7000);

    const savedEventIds = savedEvents.map((event) => event.id);
    if (savedEventIds.length) {
      await withSupabaseTimeout(db
        .from("field_reservations")
        .update({ status: "released" })
        .in("event_id", savedEventIds)
        .eq("status", "reserved"), 7000);
    }

    if (resolvedFieldLocationId && input.status === "scheduled") {
      await withSupabaseTimeout(db.from("field_reservations").insert(savedEvents.map((event) => ({
        organization_id: input.organizationId,
        field_location_id: resolvedFieldLocationId,
        event_id: event.id,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        status: "reserved",
        created_by_user_id: input.actorUserId
      }))), 7000);
    }

    const { data: guardians } = await withSupabaseTimeout(db
      .from("player_guardians")
      .select("parent_user_id,players!inner(team_id)")
      .eq("status", "active")
      .eq("players.team_id", input.teamId)
      .not("parent_user_id", "is", null), 7000) as { data: Array<{ parent_user_id: string | null }> | null };
    const recipientIds = Array.from(new Set((guardians ?? []).map((guardian) => guardian.parent_user_id).filter(Boolean))) as string[];
    const notificationType = input.status === "cancelled" ? "event_cancelled" : input.eventId ? "schedule_changed" : "new_event";
    const notificationRows = savedEvents.flatMap((event) => recipientIds.map((recipientUserId) => ({
      organization_id: input.organizationId,
      recipient_user_id: recipientUserId,
      team_id: input.teamId,
      event_id: event.id,
      notification_type: notificationType,
      title: input.status === "cancelled" ? `${title} cancelled` : `${title} schedule updated`,
      body: `${title} is ${input.status} at ${resolvedLocationName} on ${new Date(event.starts_at).toLocaleString("en-US")}.`,
      channel: "email",
      status: "pending"
    })));

    if (notificationRows.length) {
      await withSupabaseTimeout(db.from("notifications").insert(notificationRows).select("id"), 7000);
    }

    return {
      ok: true,
      message: `${savedEvents.length} schedule event(s) saved with ${notificationRows.length} pending notification draft(s). No provider send occurred.`,
      event: mapEvent(savedEvents[0]),
      events: savedEvents.map(mapEvent),
      eventSeriesId: eventSeriesId || undefined,
      recurrenceCount: savedEvents.length,
      notificationCount: notificationRows.length
    };
  } catch {
    return { ok: false, message: "Schedule event could not reach Supabase." };
  }
}
