import { seedState, type EventStatus, type EventType, type LeagueEvent, type Team } from "@/lib/domain";
import { requireActiveTeamCoachOrOrgAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
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
    mapUrl?: string;
    mapEmbedUrl?: string;
    status: "active" | "inactive";
  }>;
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
  opponent?: string;
  status: EventStatus;
  reason?: string;
}

function adminDb() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

function fallbackScheduleOperationsData(): ScheduleOperationsData {
  return {
    organizationId: seedState.organization.id,
    isSupabaseBacked: false,
    message: "Showing local schedule fallback until Supabase schedule rows are available.",
    teams: seedState.teams,
    events: seedState.events,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function overlaps(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  return new Date(leftStart).getTime() < new Date(rightEnd).getTime() &&
    new Date(leftEnd).getTime() > new Date(rightStart).getTime();
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

export async function listScheduleOperationsData(): Promise<ScheduleOperationsData> {
  try {
    const db = adminDb();
    const [
      { data: organizations },
      { data: teams },
      { data: events },
      { data: fieldLocations }
    ] = await withSupabaseTimeout(Promise.all([
      db.from("organizations").select("id,name").limit(1),
      db.from("teams").select("id,organization_id,season_id,division,name,coach_user_id,mascot,primary_color,secondary_color,theme_key").order("division", { ascending: true }).order("name", { ascending: true }),
      db.from("events").select("id,organization_id,team_id,season_id,title,event_type,starts_at,ends_at,location_name,location_address,opponent,status,created_at,updated_at").order("starts_at", { ascending: true }),
      db.from("field_locations").select("id,organization_id,name,address,map_url,map_embed_url,status").order("name", { ascending: true })
    ]), 7000) as [
      { data: Array<{ id: string; name: string }> | null },
      { data: Array<{ id: string; organization_id: string; season_id: string; division: string; name: string; coach_user_id: string | null; mascot: string; primary_color: string; secondary_color: string; theme_key: Team["themeKey"] }> | null },
      { data: Array<Parameters<typeof mapEvent>[0]> | null },
      { data: Array<{ id: string; organization_id: string; name: string; address: string; map_url: string | null; map_embed_url: string | null; status: "active" | "inactive" }> | null }
    ];

    const organization = organizations?.[0];
    if (!organization || !teams?.length) return fallbackScheduleOperationsData();

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
        themeKey: team.theme_key
      })),
      events: (events ?? []).map(mapEvent),
      fieldLocations: (fieldLocations ?? []).map((field) => ({
        id: field.id,
        organizationId: field.organization_id,
        name: field.name,
        address: field.address,
        mapUrl: field.map_url ?? undefined,
        mapEmbedUrl: field.map_embed_url ?? undefined,
        status: field.status
      }))
    };
  } catch {
    return fallbackScheduleOperationsData();
  }
}

export async function saveScheduleEvent(input: SaveScheduleEventInput) {
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

    const { data: existingEvents } = await withSupabaseTimeout(db
      .from("events")
      .select("id,title,team_id,location_name,starts_at,ends_at,status")
      .eq("organization_id", input.organizationId)
      .eq("status", "scheduled"), 7000) as {
        data: Array<{ id: string; title: string; team_id: string; location_name: string | null; starts_at: string; ends_at: string; status: EventStatus }> | null;
      };

    const conflicts = (existingEvents ?? [])
      .filter((event) => event.id !== input.eventId)
      .filter((event) => overlaps(input.startsAt, input.endsAt, event.starts_at, event.ends_at))
      .filter((event) => event.team_id === input.teamId || (event.location_name ?? "").toLowerCase() === locationName.toLowerCase());

    if (conflicts.length) {
      return {
        ok: false,
        message: `${conflicts.length} schedule conflict(s) must be resolved before saving this event.`,
        conflicts
      };
    }

    const beforeResult = input.eventId
      ? await withSupabaseTimeout(db.from("events").select("*").eq("id", input.eventId).maybeSingle(), 7000) as { data: Record<string, unknown> | null }
      : { data: null };
    const changeType = !input.eventId
      ? "created"
      : input.status === "cancelled"
        ? "cancelled"
        : input.status === "completed"
          ? "completed"
          : beforeResult.data?.location_name !== locationName
            ? "location_changed"
            : "time_changed";

    const { data: event, error } = await withSupabaseTimeout(db
      .from("events")
      .upsert({
        ...(input.eventId ? { id: input.eventId } : {}),
        organization_id: input.organizationId,
        season_id: input.seasonId,
        team_id: input.teamId,
        title,
        event_type: input.eventType,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        location_name: locationName,
        location_address: locationAddress,
        field_location_id: input.fieldLocationId ?? null,
        opponent: input.opponent?.trim() || null,
        status: input.status,
        cancelled_reason: input.status === "cancelled" ? input.reason?.trim() || "Cancelled by staff." : null,
        schedule_version: (typeof beforeResult.data?.schedule_version === "number" ? beforeResult.data.schedule_version : 0) + 1
      })
      .select("id,organization_id,team_id,season_id,title,event_type,starts_at,ends_at,location_name,location_address,opponent,status,created_at,updated_at")
      .single(), 7000) as {
        data: Parameters<typeof mapEvent>[0] | null;
        error: { message?: string } | null;
      };

    if (error || !event) return { ok: false, message: "Schedule event could not be saved." };

    await withSupabaseTimeout(db.from("event_change_logs").insert({
      event_id: event.id,
      organization_id: input.organizationId,
      team_id: input.teamId,
      actor_user_id: input.actorUserId,
      change_type: changeType,
      before_json: beforeResult.data,
      after_json: event,
      reason: input.reason?.trim() || null
    }), 7000);

    const { data: guardians } = await withSupabaseTimeout(db
      .from("player_guardians")
      .select("parent_user_id,players!inner(team_id)")
      .eq("status", "active")
      .eq("players.team_id", input.teamId)
      .not("parent_user_id", "is", null), 7000) as { data: Array<{ parent_user_id: string | null }> | null };
    const recipientIds = Array.from(new Set((guardians ?? []).map((guardian) => guardian.parent_user_id).filter(Boolean))) as string[];
    const notificationType = input.status === "cancelled" ? "event_cancelled" : input.eventId ? "schedule_changed" : "new_event";
    const notificationRows = recipientIds.map((recipientUserId) => ({
      organization_id: input.organizationId,
      recipient_user_id: recipientUserId,
      team_id: input.teamId,
      event_id: event.id,
      notification_type: notificationType,
      title: input.status === "cancelled" ? `${title} cancelled` : `${title} schedule updated`,
      body: `${title} is ${input.status} at ${locationName} on ${new Date(input.startsAt).toLocaleString("en-US")}.`,
      channel: "email",
      status: "pending"
    }));

    if (notificationRows.length) {
      await withSupabaseTimeout(db.from("notifications").insert(notificationRows).select("id"), 7000);
    }

    return {
      ok: true,
      message: `Schedule event saved with ${notificationRows.length} pending notification draft(s). No provider send occurred.`,
      event: mapEvent(event),
      notificationCount: notificationRows.length
    };
  } catch {
    return { ok: false, message: "Schedule event could not reach Supabase." };
  }
}
