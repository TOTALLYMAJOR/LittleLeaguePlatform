import "server-only";

import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Event change logs carry raw audit JSON. This adapter is intentionally
  // dynamic and returns only the family-safe projection below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

type QueryResult<T> = {
  data: T[] | null;
  error?: { message?: string } | null;
};

type EventRow = {
  id: string;
  organization_id: string;
  season_id: string;
  team_id: string;
  title: string;
};

type PlayerRow = {
  id: string;
  organization_id: string;
  season_id: string;
  team_id: string;
  first_name: string;
  last_initial: string;
};

type GuardianRow = {
  player_id: string;
  parent_user_id: string;
  status: string;
};

type TeamRow = {
  id: string;
  organization_id: string;
  season_id: string;
  name: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
};

type FieldRow = {
  id: string;
  name: string;
  field_label?: string | null;
};

type ChangeLogRow = {
  id: string;
  event_id: string;
  organization_id: string;
  team_id: string;
  actor_user_id: string | null;
  change_type: "created" | "time_changed" | "location_changed" | "cancelled" | "completed" | "restored";
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown>;
  created_at: string;
};

export interface ParentEventChangeDiff {
  field: "date" | "start_time" | "end_time" | "arrival_time" | "venue" | "field" | "status" | "family_instruction" | "equipment";
  label: string;
  previousValue: string;
  currentValue: string;
}

export interface ParentEventChange {
  id: string;
  eventId: string;
  eventTitle: string;
  teamName: string;
  childLabels: string[];
  changeType: ChangeLogRow["change_type"];
  actorLabel: string;
  changedAt: string;
  canonicalHref: string;
  diffs: ParentEventChangeDiff[];
}

export interface ParentEventChangeLogReadResult {
  ok: boolean;
  message: string;
  scope: {
    parentUserId: string;
    organizationId: string;
    seasonId: string;
    familyContextKey: string;
    limit: number;
  };
  changes: ParentEventChange[];
}

const DEFAULT_LIMIT = 20;

const allowedFields: Record<string, {
  field: ParentEventChangeDiff["field"];
  label: string;
  format: (value: unknown, context: FormatContext) => string;
}> = {
  starts_at: { field: "start_time", label: "Start time", format: formatTime },
  ends_at: { field: "end_time", label: "End time", format: formatTime },
  arrival_at: { field: "arrival_time", label: "Arrival time", format: formatTime },
  arrival_time: { field: "arrival_time", label: "Arrival time", format: formatPlain },
  location_name: { field: "venue", label: "Venue", format: formatPlain },
  field_location_id: { field: "field", label: "Field", format: formatField },
  status: { field: "status", label: "Event status", format: formatStatus },
  public_family_instruction: { field: "family_instruction", label: "Family instruction", format: formatPlain },
  public_uniform_instruction: { field: "equipment", label: "Uniform", format: formatPlain },
  public_equipment_instruction: { field: "equipment", label: "Equipment", format: formatPlain }
};

type FormatContext = {
  fieldsById: Map<string, string>;
};

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

export async function listParentEventChangeLogs({
  parentUserId,
  limit = DEFAULT_LIMIT
}: {
  parentUserId: string;
  limit?: number;
}): Promise<ParentEventChangeLogReadResult> {
  const boundedLimit = Math.min(50, Math.max(1, Math.floor(limit)));
  const emptyScope = {
    parentUserId,
    organizationId: "",
    seasonId: "",
    familyContextKey: "unavailable",
    limit: boundedLimit
  };

  if (!parentUserId) {
    return { ok: false, message: "Signed-in parent access is required.", scope: emptyScope, changes: [] };
  }

  try {
    const db = dbClient();
    const { data: guardianRows, error: guardianError } = await withSupabaseTimeout(db
      .from("player_guardians")
      .select("player_id,parent_user_id,status")
      .eq("parent_user_id", parentUserId)
      .eq("status", "active"), 7000) as QueryResult<GuardianRow>;
    if (guardianError || !guardianRows?.length) {
      return { ok: false, message: "No active guardian-linked child scope is available.", scope: emptyScope, changes: [] };
    }

    const playerIds = unique(guardianRows.map((row) => row.player_id));
    const { data: players, error: playersError } = await withSupabaseTimeout(db
      .from("players")
      .select("id,organization_id,season_id,team_id,first_name,last_initial")
      .in("id", playerIds), 7000) as QueryResult<PlayerRow>;
    if (playersError || !players?.length) {
      return { ok: false, message: "Guardian child scope could not be confirmed.", scope: emptyScope, changes: [] };
    }

    const teamIds = unique(players.map((player) => player.team_id));
    const organizationIds = unique(players.map((player) => player.organization_id));
    const seasonIds = unique(players.map((player) => player.season_id));
    const scope = {
      parentUserId,
      organizationId: organizationIds.length === 1 ? organizationIds[0] : organizationIds.sort().join("."),
      seasonId: seasonIds.length === 1 ? seasonIds[0] : seasonIds.sort().join("."),
      familyContextKey: teamIds.sort().join("."),
      limit: boundedLimit
    };

    const [{ data: teams, error: teamsError }, { data: events, error: eventsError }] = await withSupabaseTimeout(Promise.all([
      db
        .from("teams")
        .select("id,organization_id,season_id,name")
        .in("id", teamIds)
        .in("organization_id", organizationIds)
        .in("season_id", seasonIds),
      db
        .from("events")
        .select("id,organization_id,season_id,team_id,title")
        .in("team_id", teamIds)
        .in("organization_id", organizationIds)
        .in("season_id", seasonIds)
    ]), 7000) as [QueryResult<TeamRow>, QueryResult<EventRow>];
    if (teamsError || eventsError || !teams?.length || !events?.length) {
      return { ok: false, message: "Parent event scope could not be confirmed.", scope, changes: [] };
    }

    const eventIds = events.map((event) => event.id);
    const { data: logs, error: logsError } = await withSupabaseTimeout(db
      .from("event_change_logs")
      .select("id,event_id,organization_id,team_id,actor_user_id,change_type,before_json,after_json,created_at")
      .in("event_id", eventIds)
      .in("team_id", teamIds)
      .in("organization_id", organizationIds)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(boundedLimit), 7000) as QueryResult<ChangeLogRow>;
    if (logsError) {
      return { ok: false, message: "Event changes could not be loaded. No device marker changed.", scope, changes: [] };
    }

    const actorIds = unique((logs ?? []).map((log) => log.actor_user_id).filter(Boolean) as string[]);
    const fieldIds = unique((logs ?? []).flatMap((log) => [
      idValue(log.before_json?.field_location_id),
      idValue(log.after_json?.field_location_id)
    ]).filter(Boolean) as string[]);
    const [{ data: profiles }, { data: fields }] = await withSupabaseTimeout(Promise.all([
      actorIds.length
        ? db.from("profiles").select("id,display_name").in("id", actorIds)
        : Promise.resolve({ data: [], error: null }),
      fieldIds.length
        ? db.from("field_locations").select("id,name,field_label").in("id", fieldIds).in("organization_id", organizationIds)
        : Promise.resolve({ data: [], error: null })
    ]), 7000) as [QueryResult<ProfileRow>, QueryResult<FieldRow>];

    const eventsById = new Map(events.map((event) => [event.id, event]));
    const teamsById = new Map(teams.map((team) => [team.id, team]));
    const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name || "League staff"]));
    const fieldsById = new Map((fields ?? []).map((field) => [field.id, field.field_label || field.name]));
    const playersByTeamId = new Map<string, PlayerRow[]>();
    for (const player of players) {
      playersByTeamId.set(player.team_id, [...(playersByTeamId.get(player.team_id) ?? []), player]);
    }

    return {
      ok: true,
      message: (logs ?? []).length ? "Showing family-safe event changes." : "No family-safe event changes are visible.",
      scope,
      changes: (logs ?? [])
        .map((log) => {
          const event = eventsById.get(log.event_id);
          const team = teamsById.get(log.team_id);
          if (!event || !team || event.organization_id !== log.organization_id || event.team_id !== log.team_id) return undefined;
          const diffs = buildDiffs(log, { fieldsById });
          if (!diffs.length && log.change_type !== "created" && log.change_type !== "cancelled" && log.change_type !== "restored") return undefined;
          return {
            id: log.id,
            eventId: log.event_id,
            eventTitle: event.title,
            teamName: team.name,
            childLabels: (playersByTeamId.get(log.team_id) ?? []).map((player) => `${player.first_name} ${player.last_initial}.`),
            changeType: log.change_type,
            actorLabel: log.actor_user_id ? profilesById.get(log.actor_user_id) ?? "League staff" : "League staff",
            changedAt: log.created_at,
            canonicalHref: `/parent/schedule?eventId=${encodeURIComponent(log.event_id)}`,
            diffs
          };
        })
        .filter((change): change is ParentEventChange => Boolean(change))
    };
  } catch {
    return { ok: false, message: "Event changes could not be loaded. No device marker changed.", scope: emptyScope, changes: [] };
  }
}

function buildDiffs(log: ChangeLogRow, context: FormatContext): ParentEventChangeDiff[] {
  return Object.entries(allowedFields).flatMap(([fieldName, config]) => {
    const before = log.before_json?.[fieldName];
    const after = log.after_json?.[fieldName];
    if (before === after || typeof after === "undefined") return [];
    return [{
      field: config.field,
      label: config.label,
      previousValue: typeof before === "undefined" || before === null ? "Not published" : config.format(before, context),
      currentValue: config.format(after, context)
    }];
  });
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function idValue(value: unknown) {
  return typeof value === "string" && value.length >= 8 ? value : undefined;
}

function formatPlain(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "Not published";
}

function formatStatus(value: unknown) {
  const text = formatPlain(value);
  if (text === "cancelled") return "Cancelled";
  if (text === "completed") return "Completed";
  if (text === "scheduled") return "Scheduled";
  return text;
}

function formatField(value: unknown, context: FormatContext) {
  const id = idValue(value);
  return id ? context.fieldsById.get(id) ?? "Published field" : formatPlain(value);
}

function formatTime(value: unknown) {
  if (typeof value !== "string") return "Not published";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}
