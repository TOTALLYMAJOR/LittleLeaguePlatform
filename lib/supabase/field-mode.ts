import { createHash } from "node:crypto";
import { featureGateDecision } from "@/lib/services/feature-gates";
import { requireActiveTeamCoachOrOrgAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(name: string, input: Record<string, unknown>): any;
};

type DynamicResult<T> = {
  data: T | null;
  error: { message?: string } | null;
};

function adminDb() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

function run<T>(operation: PromiseLike<unknown>) {
  return withSupabaseTimeout(operation as PromiseLike<DynamicResult<T>>, 7000);
}

async function requireEventStaff(input: {
  eventId: string;
  actorUserId: string;
  action: string;
}) {
  const db = adminDb();
  const eventResult = await run<{
    id: string;
    team_id: string;
    organization_id: string;
    schedule_version: number;
  }>(db.from("events").select("id,team_id,organization_id,schedule_version").eq("id", input.eventId).maybeSingle());
  if (eventResult.error || !eventResult.data) {
    return { ok: false as const, message: `${input.action} requires a known event.` };
  }
  const access = await requireActiveTeamCoachOrOrgAdmin({
    db,
    teamId: eventResult.data.team_id,
    userId: input.actorUserId,
    action: input.action
  });
  if (!access.ok) return { ok: false as const, message: access.message };
  return { ok: true as const, db, event: eventResult.data };
}

export async function saveCoachAttendance(input: {
  eventId: string;
  playerId: string;
  actorUserId: string;
  attendanceValue: "present" | "absent" | "late";
  expectedLockVersion: number;
  expectedScheduleVersion: number;
  clientActionId: string;
  offlineReplay?: boolean;
}) {
  if (!input.eventId || !input.playerId || !input.actorUserId || !input.clientActionId) {
    return { ok: false, code: "invalid_request", message: "Attendance requires event, player, and action receipt." };
  }
  try {
    const access = await requireEventStaff({
      eventId: input.eventId,
      actorUserId: input.actorUserId,
      action: "record event attendance"
    });
    if (!access.ok) return access;
    if (input.offlineReplay) {
      const organizationResult = await run<{ offline_writes_enabled: boolean }>(access.db
        .from("organizations")
        .select("offline_writes_enabled")
        .eq("id", access.event.organization_id)
        .single());
      const gate = featureGateDecision({
        feature: "offline_writes",
        organizationEnabled: organizationResult.data?.offline_writes_enabled
      });
      if (!gate.enabled) {
        return {
          ok: false,
          code: "offline_disabled",
          message: "This saved device action must be retried online because offline writes are disabled."
        };
      }
    }
    const payloadHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const result = await run<Record<string, unknown>>(access.db.rpc("save_coach_attendance_with_versions", {
      p_event_id: input.eventId,
      p_player_id: input.playerId,
      p_actor_user_id: input.actorUserId,
      p_attendance_value: input.attendanceValue,
      p_expected_lock_version: input.expectedLockVersion,
      p_expected_schedule_version: input.expectedScheduleVersion,
      p_client_action_id: input.clientActionId,
      p_payload_hash: payloadHash
    }));
    if (result.error || !result.data) {
      return { ok: false, code: "unavailable", message: "Attendance could not be saved to team records." };
    }
    return result.data;
  } catch {
    return { ok: false, code: "unavailable", message: "Attendance could not reach team records." };
  }
}

export async function saveCoachEventNote(input: {
  eventId: string;
  actorUserId: string;
  body: string;
  expectedScheduleVersion: number;
  clientActionId: string;
  offlineReplay?: boolean;
}) {
  const body = input.body.trim();
  if (!input.eventId || !input.actorUserId || !input.clientActionId || !body || body.length > 4000) {
    return { ok: false, code: "invalid_request", message: "Coach note must contain 1 to 4,000 characters and an action receipt." };
  }
  try {
    const access = await requireEventStaff({
      eventId: input.eventId,
      actorUserId: input.actorUserId,
      action: "save an operational coach note"
    });
    if (!access.ok) return access;
    if (input.offlineReplay) {
      const organizationResult = await run<{ offline_writes_enabled: boolean }>(access.db
        .from("organizations")
        .select("offline_writes_enabled")
        .eq("id", access.event.organization_id)
        .single());
      const gate = featureGateDecision({
        feature: "offline_writes",
        organizationEnabled: organizationResult.data?.offline_writes_enabled
      });
      if (!gate.enabled) {
        return {
          ok: false,
          code: "offline_disabled",
          message: "This saved device action must be retried online because offline writes are disabled."
        };
      }
    }
    const payloadHash = createHash("sha256").update(JSON.stringify({ ...input, body })).digest("hex");
    const result = await run<Record<string, unknown>>(access.db.rpc("save_coach_event_note_with_receipt", {
      p_event_id: input.eventId,
      p_actor_user_id: input.actorUserId,
      p_body: body,
      p_expected_schedule_version: input.expectedScheduleVersion,
      p_client_action_id: input.clientActionId,
      p_payload_hash: payloadHash
    }));
    if (result.error || !result.data) {
      return { ok: false, code: "unavailable", message: "Coach note could not be saved to team records." };
    }
    return result.data;
  } catch {
    return { ok: false, code: "unavailable", message: "Coach note could not reach team records." };
  }
}
