import type { Player, Rsvp, WeatherAlert } from "@/lib/domain";
import { requireActiveTeamCoachOrOrgAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Resolution reviews and their RPC are introduced by migration 0024.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(name: string, parameters: Record<string, unknown>): any;
};

export type GameDayDecision = "monitor" | "confirm_on_time" | "delay" | "cancel";

export function validateGameDayResolution(input: {
  eventId: string;
  decision: string;
  reason: string;
  startsAt?: string;
  idempotencyKey: string;
  now?: number;
}) {
  if (!input.eventId || !input.idempotencyKey || !["monitor", "confirm_on_time", "delay", "cancel"].includes(input.decision)) {
    return { ok: false, message: "Resolution requires event, supported decision, and action receipt." };
  }
  if (input.reason.trim().length < 10) {
    return { ok: false, message: "Resolution requires a reason of at least 10 characters." };
  }
  if (input.decision === "delay") {
    const timestamp = Date.parse(input.startsAt ?? "");
    if (Number.isNaN(timestamp) || timestamp <= (input.now ?? Date.now())) {
      return { ok: false, message: "Delay decisions require a future start time." };
    }
  }
  return { ok: true, message: "Resolution is ready for human review." };
}

export interface GameDayResolutionReview {
  id: string;
  eventId: string;
  teamId: string;
  actorUserId: string;
  decision: GameDayDecision;
  reason: string;
  evidence: Record<string, unknown>;
  affectedRecipientCount: number;
  notificationCount: number;
  reviewedAt: string;
  appliedAt?: string;
}

export interface GameDayResolutionEvidence {
  players: Player[];
  rsvps: Rsvp[];
  weatherAlerts: WeatherAlert[];
}

type ReviewRow = {
  id: string;
  event_id: string;
  team_id: string;
  actor_user_id: string;
  decision: GameDayDecision;
  reason: string;
  evidence_json: Record<string, unknown>;
  affected_recipient_count: number;
  notification_count: number;
  reviewed_at: string;
  applied_at: string | null;
};

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

function mapReview(row: ReviewRow): GameDayResolutionReview {
  return {
    id: row.id,
    eventId: row.event_id,
    teamId: row.team_id,
    actorUserId: row.actor_user_id,
    decision: row.decision,
    reason: row.reason,
    evidence: row.evidence_json ?? {},
    affectedRecipientCount: row.affected_recipient_count,
    notificationCount: row.notification_count,
    reviewedAt: row.reviewed_at,
    appliedAt: row.applied_at ?? undefined
  };
}

export async function listGameDayResolutionEvidence(input: { teamIds: string[] }) {
  const teamIds = Array.from(new Set(input.teamIds.filter(Boolean)));
  const empty: GameDayResolutionEvidence = { players: [], rsvps: [], weatherAlerts: [] };
  if (!teamIds.length) {
    return { ok: false, message: "Game-day evidence requires coach or admin team scope.", evidence: empty };
  }
  try {
    const db = dbClient();
    const [playersResult, eventsResult, weatherResult] = await withSupabaseTimeout(Promise.all([
      db
        .from("players")
        .select("id,organization_id,season_id,team_id,first_name,last_initial,jersey")
        .in("team_id", teamIds)
        .order("first_name", { ascending: true }),
      db
        .from("events")
        .select("id")
        .in("team_id", teamIds),
      db
        .from("weather_alerts")
        .select("id,team_id,event_id,headline,detail,severity,status,created_at")
        .in("team_id", teamIds)
        .order("created_at", { ascending: false })
    ]), 7000) as [
      { data: Array<{
        id: string;
        organization_id: string;
        season_id: string;
        team_id: string;
        first_name: string;
        last_initial: string;
        jersey: string | null;
      }> | null; error: { message?: string } | null },
      { data: Array<{ id: string }> | null; error: { message?: string } | null },
      { data: Array<{
        id: string;
        team_id: string;
        event_id: string;
        headline: string;
        detail: string;
        severity: WeatherAlert["severity"];
        status: WeatherAlert["status"];
        created_at: string;
      }> | null; error: { message?: string } | null }
    ];
    if (playersResult.error || eventsResult.error || weatherResult.error) {
      return { ok: false, message: "Game-day roster or weather evidence is unavailable.", evidence: empty };
    }
    const eventIds = (eventsResult.data ?? []).map((event) => event.id);
    const rsvpsResult = eventIds.length
      ? await withSupabaseTimeout(db
        .from("rsvps")
        .select("id,event_id,player_id,parent_user_id,response,note,responded_at,confirmed_schedule_version,lock_version,last_updated_by_user_id,client_action_id,created_at,updated_at")
        .in("event_id", eventIds)
        .order("responded_at", { ascending: false }), 7000) as {
          data: Array<{
            id: string;
            event_id: string;
            player_id: string;
            parent_user_id: string;
            response: Rsvp["response"];
            note: string | null;
            responded_at: string;
            confirmed_schedule_version: number | null;
            lock_version: number | null;
            last_updated_by_user_id: string | null;
            client_action_id: string | null;
            created_at: string;
            updated_at: string;
          }> | null;
          error: { message?: string } | null;
        }
      : { data: [], error: null };
    if (rsvpsResult.error) {
      return { ok: false, message: "Game-day RSVP evidence is unavailable.", evidence: empty };
    }
    return {
      ok: true,
      message: "Game-day roster, RSVP, and weather evidence loaded for the signed-in team scope.",
      evidence: {
        players: (playersResult.data ?? []).map((player) => ({
          id: player.id,
          organizationId: player.organization_id,
          seasonId: player.season_id,
          teamId: player.team_id,
          firstName: player.first_name,
          lastInitial: player.last_initial,
          jersey: player.jersey ?? "TBD"
        })),
        rsvps: (rsvpsResult.data ?? []).map((rsvp) => ({
          id: rsvp.id,
          eventId: rsvp.event_id,
          playerId: rsvp.player_id,
          parentUserId: rsvp.parent_user_id,
          response: rsvp.response,
          note: rsvp.note ?? undefined,
          respondedAt: rsvp.responded_at,
          confirmedScheduleVersion: rsvp.confirmed_schedule_version ?? 1,
          lockVersion: rsvp.lock_version ?? 0,
          lastUpdatedByUserId: rsvp.last_updated_by_user_id ?? undefined,
          clientActionId: rsvp.client_action_id ?? undefined,
          createdAt: rsvp.created_at,
          updatedAt: rsvp.updated_at
        })),
        weatherAlerts: (weatherResult.data ?? []).map((alert) => ({
          id: alert.id,
          teamId: alert.team_id,
          eventId: alert.event_id,
          headline: alert.headline,
          detail: alert.detail,
          severity: alert.severity,
          status: alert.status,
          createdAt: alert.created_at
        }))
      }
    };
  } catch {
    return { ok: false, message: "Game-day evidence could not reach team records.", evidence: empty };
  }
}

export async function listGameDayResolutionReviews(input: { teamIds: string[] }) {
  const teamIds = Array.from(new Set(input.teamIds.filter(Boolean)));
  if (!teamIds.length) {
    return { ok: false, message: "Game-day resolution requires coach or admin team scope.", reviews: [] as GameDayResolutionReview[] };
  }
  try {
    const { data, error } = await withSupabaseTimeout(dbClient()
      .from("game_day_resolution_reviews")
      .select("id,event_id,team_id,actor_user_id,decision,reason,evidence_json,affected_recipient_count,notification_count,reviewed_at,applied_at")
      .in("team_id", teamIds)
      .order("reviewed_at", { ascending: false })
      .limit(30), 7000) as {
        data: ReviewRow[] | null;
        error: { message?: string } | null;
      };
    if (error) return { ok: false, message: "Game-day review evidence is unavailable.", reviews: [] as GameDayResolutionReview[] };
    return {
      ok: true,
      message: "Game-day review evidence loaded for the signed-in team scope.",
      reviews: (data ?? []).map(mapReview)
    };
  } catch {
    return { ok: false, message: "Game-day review evidence could not reach team records.", reviews: [] as GameDayResolutionReview[] };
  }
}

export async function applyGameDayResolution(input: {
  actorUserId: string;
  eventId: string;
  decision: GameDayDecision;
  reason: string;
  startsAt?: string;
  idempotencyKey: string;
}) {
  const validation = validateGameDayResolution(input);
  if (!input.actorUserId || !validation.ok) {
    return { ok: false, message: input.actorUserId ? validation.message : "Resolution requires an acting coach or admin." };
  }
  try {
    const db = dbClient();
    const { data: event } = await withSupabaseTimeout(db
      .from("events")
      .select("id,team_id")
      .eq("id", input.eventId)
      .maybeSingle(), 7000) as { data: { id: string; team_id: string } | null };
    if (!event) return { ok: false, message: "Game-day event was not found." };
    const access = await requireActiveTeamCoachOrOrgAdmin({
      db,
      teamId: event.team_id,
      userId: input.actorUserId,
      action: "resolve game-day events"
    });
    if (!access.ok) return { ok: false, message: access.message };
    const { data, error } = await withSupabaseTimeout(db.rpc("apply_game_day_resolution", {
      p_event_id: input.eventId,
      p_actor_user_id: input.actorUserId,
      p_decision: input.decision,
      p_reason: input.reason.trim(),
      p_starts_at: input.startsAt ?? null,
      p_idempotency_key: input.idempotencyKey
    }), 12000) as {
      data: Record<string, unknown> | null;
      error: { message?: string } | null;
    };
    if (error || !data) return { ok: false, message: "Game-day resolution transaction could not be completed." };
    return data;
  } catch {
    return { ok: false, message: "Game-day resolution could not reach team records." };
  }
}
