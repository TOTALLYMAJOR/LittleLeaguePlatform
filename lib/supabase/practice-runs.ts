import { requireActiveTeamCoachOrOrgAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Practice-run receipts are introduced by the coordination-loop migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export interface PracticeRunPlan {
  title: string;
  focusAreas: string[];
  blocks: Array<{
    title: string;
    duration: string;
    activity: string;
    coachCue?: string;
  }>;
}

export interface PracticeRunObservations {
  workedWell: string;
  needsWork: string;
  familyNote: string;
}

export interface PracticeRunReceipt {
  id: string;
  organizationId: string;
  seasonId: string;
  teamId: string;
  eventId?: string;
  coachUserId: string;
  plan: PracticeRunPlan;
  observations: Partial<PracticeRunObservations>;
  parentReplayId?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

type PracticeRunRow = {
  id: string;
  organization_id: string;
  season_id: string;
  team_id: string;
  event_id: string | null;
  coach_user_id: string;
  plan_json: PracticeRunPlan;
  observations_json: Partial<PracticeRunObservations>;
  parent_replay_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

function mapReceipt(row: PracticeRunRow): PracticeRunReceipt {
  return {
    id: row.id,
    organizationId: row.organization_id,
    seasonId: row.season_id,
    teamId: row.team_id,
    eventId: row.event_id ?? undefined,
    coachUserId: row.coach_user_id,
    plan: row.plan_json,
    observations: row.observations_json ?? {},
    parentReplayId: row.parent_replay_id ?? undefined,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const receiptColumns = [
  "id",
  "organization_id",
  "season_id",
  "team_id",
  "event_id",
  "coach_user_id",
  "plan_json",
  "observations_json",
  "parent_replay_id",
  "started_at",
  "completed_at",
  "created_at",
  "updated_at"
].join(",");

export function validatePracticeRunPlan(plan: PracticeRunPlan) {
  if (!plan?.title?.trim() || !Array.isArray(plan.focusAreas) || !Array.isArray(plan.blocks)) {
    return { ok: false, message: "Practice plan requires a title, focus areas, and timed blocks." };
  }
  if (plan.focusAreas.length < 1 || plan.focusAreas.length > 5 || plan.blocks.length < 2 || plan.blocks.length > 10) {
    return { ok: false, message: "Practice plan requires 1-5 focus areas and 2-10 timed blocks." };
  }
  if (plan.blocks.some((block) => !block.title?.trim() || !block.duration?.trim() || !block.activity?.trim())) {
    return { ok: false, message: "Every practice block requires a title, duration, and activity." };
  }
  return { ok: true, message: "Practice plan is ready for coach review." };
}

export async function listPracticeRunReceipts(input: { teamIds: string[] }) {
  const teamIds = Array.from(new Set(input.teamIds.filter(Boolean)));
  if (!teamIds.length) {
    return { ok: false, message: "Practice runs require an assigned coach team.", receipts: [] as PracticeRunReceipt[] };
  }
  try {
    const { data, error } = await withSupabaseTimeout(dbClient()
      .from("practice_run_receipts")
      .select(receiptColumns)
      .in("team_id", teamIds)
      .order("created_at", { ascending: false })
      .limit(30), 7000) as {
        data: PracticeRunRow[] | null;
        error: { message?: string } | null;
      };
    if (error) {
      return { ok: false, message: "Practice-run evidence is unavailable.", receipts: [] as PracticeRunReceipt[] };
    }
    return {
      ok: true,
      message: "Practice-run evidence loaded for the signed-in coach scope.",
      receipts: (data ?? []).map(mapReceipt)
    };
  } catch {
    return { ok: false, message: "Practice-run evidence could not reach team records.", receipts: [] as PracticeRunReceipt[] };
  }
}

export async function savePracticeRunPlan(input: {
  actorUserId: string;
  teamId: string;
  eventId?: string;
  plan: PracticeRunPlan;
  idempotencyKey: string;
}) {
  const validation = validatePracticeRunPlan(input.plan);
  if (!input.actorUserId || !input.teamId || !input.idempotencyKey || !validation.ok) {
    return { ok: false, message: validation.ok ? "Practice plan requires actor, team, and action receipt." : validation.message };
  }
  try {
    const db = dbClient();
    const access = await requireActiveTeamCoachOrOrgAdmin({
      db,
      teamId: input.teamId,
      userId: input.actorUserId,
      action: "save practice-run plans"
    });
    if (!access.ok || !access.team) return { ok: false, message: access.message };
    if (input.eventId) {
      const { data: event } = await withSupabaseTimeout(db
        .from("events")
        .select("id,team_id,event_type")
        .eq("id", input.eventId)
        .maybeSingle(), 7000) as {
          data: { id: string; team_id: string; event_type: string } | null;
        };
      if (!event || event.team_id !== input.teamId || event.event_type !== "practice") {
        return { ok: false, message: "Practice-run plans can only attach to a practice on the selected team." };
      }
    }

    const { data: existing } = await withSupabaseTimeout(db
      .from("practice_run_receipts")
      .select(receiptColumns)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle(), 7000) as { data: PracticeRunRow | null };
    if (existing) {
      return { ok: true, idempotentReplay: true, message: "Practice plan was already saved.", receipt: mapReceipt(existing) };
    }

    const { data, error } = await withSupabaseTimeout(db
      .from("practice_run_receipts")
      .insert({
        organization_id: access.team.organization_id,
        season_id: access.team.season_id,
        team_id: input.teamId,
        event_id: input.eventId ?? null,
        coach_user_id: input.actorUserId,
        plan_json: input.plan,
        observations_json: {},
        idempotency_key: input.idempotencyKey
      })
      .select(receiptColumns)
      .single(), 7000) as {
        data: PracticeRunRow | null;
        error: { message?: string } | null;
      };
    if (error || !data) return { ok: false, message: "Practice plan receipt could not be saved." };
    await withSupabaseTimeout(db.from("audit_events").insert({
      organization_id: access.team.organization_id,
      actor_user_id: input.actorUserId,
      action: "practice_run_plan_saved",
      target_type: "practice_run_receipt",
      target_id: data.id,
      summary: "Coach saved a reviewed practice plan. No family recap was published."
    }), 7000);
    return { ok: true, message: "Practice plan saved. Start and completion remain separate coach actions.", receipt: mapReceipt(data) };
  } catch {
    return { ok: false, message: "Practice plan could not reach team records." };
  }
}

export async function advancePracticeRun(input: {
  actorUserId: string;
  receiptId: string;
  action: "start" | "complete";
  observations?: PracticeRunObservations;
}) {
  if (!input.actorUserId || !input.receiptId) {
    return { ok: false, message: "Practice-run action requires receipt and acting coach." };
  }
  if (input.action === "complete" && (
    !input.observations?.workedWell?.trim() ||
    !input.observations.needsWork?.trim() ||
    !input.observations.familyNote?.trim()
  )) {
    return { ok: false, message: "Practice completion requires what worked, what needs work, and a family note." };
  }
  try {
    const db = dbClient();
    const { data: receipt } = await withSupabaseTimeout(db
      .from("practice_run_receipts")
      .select(receiptColumns)
      .eq("id", input.receiptId)
      .maybeSingle(), 7000) as { data: PracticeRunRow | null };
    if (!receipt) return { ok: false, message: "Practice-run receipt was not found." };
    const access = await requireActiveTeamCoachOrOrgAdmin({
      db,
      teamId: receipt.team_id,
      userId: input.actorUserId,
      action: `${input.action} practice runs`
    });
    if (!access.ok) return { ok: false, message: access.message };
    if (receipt.completed_at) {
      return { ok: true, idempotentReplay: true, message: "Practice was already completed.", receipt: mapReceipt(receipt) };
    }
    if (input.action === "complete" && !receipt.started_at) {
      return { ok: false, message: "Start the practice before recording completion observations." };
    }

    const now = new Date().toISOString();
    const patch = input.action === "start"
      ? { started_at: receipt.started_at ?? now }
      : { observations_json: input.observations, completed_at: now };
    const { data: updated, error } = await withSupabaseTimeout(db
      .from("practice_run_receipts")
      .update(patch)
      .eq("id", receipt.id)
      .select(receiptColumns)
      .single(), 7000) as {
        data: PracticeRunRow | null;
        error: { message?: string } | null;
      };
    if (error || !updated) return { ok: false, message: `Practice ${input.action} could not be recorded.` };
    await withSupabaseTimeout(db.from("audit_events").insert({
      organization_id: receipt.organization_id,
      actor_user_id: input.actorUserId,
      action: `practice_run_${input.action === "start" ? "started" : "completed"}`,
      target_type: "practice_run_receipt",
      target_id: receipt.id,
      summary: input.action === "start"
        ? "Coach started the saved practice plan."
        : "Coach completed the practice and saved observations for a reviewed Parent Replay draft."
    }), 7000);
    return {
      ok: true,
      message: input.action === "start"
        ? "Practice started. Record observations before completing it."
        : "Practice completed. Observations can now seed a reviewed Parent Replay draft.",
      receipt: mapReceipt(updated)
    };
  } catch {
    return { ok: false, message: `Practice ${input.action} could not reach team records.` };
  }
}
