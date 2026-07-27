import {
  previewBalancedTeamBuildRoster,
  type BalancedTeamBuildPreview,
  type TeamBuildFriendRequest,
  type TeamBuilderRosterContext
} from "@/lib/domain";
import { requireActiveOrganizationAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { readTeamBuilderInputs, type TeamBuilderPrivateInput } from "./team-builder-inputs";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // The timestamped team-builder migration intentionally leads generated types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(name: string, parameters: Record<string, unknown>): any;
};

export type TeamBuildPlanStatus = "preview" | "edited" | "approved" | "published";

export interface TeamBuildAssignment {
  playerId: string;
  teamId: string;
}

export interface TeamBuildPlanView {
  id: string;
  organizationId: string;
  seasonId: string;
  division: string;
  targetRosterSize: number;
  status: TeamBuildPlanStatus;
  assignments: TeamBuildAssignment[];
  friendRequests: TeamBuildFriendRequest[];
  warnings: string[];
  balanceSummary: Record<string, unknown>;
  auditSummary: string;
  lockVersion: number;
  approvedAt?: string;
  publishedAt?: string;
  providerExecution: "not_started";
}

export interface TeamBuilderWorkbenchData {
  ok: boolean;
  message: string;
  organizationId: string;
  seasons: Array<{ id: string; name: string; status: "active" | "archived" }>;
  teams: Array<{ id: string; seasonId: string; name: string; division: string; status: "active" | "archived" }>;
  inputs: TeamBuilderPrivateInput[];
  plans: TeamBuildPlanView[];
  providerExecution: "not_started";
}

export interface SaveTeamBuildPlanInput {
  planId?: string;
  organizationId: string;
  seasonId: string;
  division: string;
  targetRosterSize: number;
  actorUserId: string;
  expectedLockVersion: number;
  actionId: string;
  friendRequests?: TeamBuildFriendRequest[];
  assignments?: TeamBuildAssignment[];
}

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

const planColumns = [
  "id", "organization_id", "season_id", "division", "target_roster_size",
  "status", "constraints", "assignments", "warnings", "balance_summary", "audit_summary",
  "lock_version", "approved_at", "published_at", "provider_execution"
].join(",");

function mapPlan(row: {
  id: string;
  organization_id: string;
  season_id: string;
  division: string;
  target_roster_size: number;
  status: TeamBuildPlanStatus;
  constraints: { friendRequests?: TeamBuildFriendRequest[] } | null;
  assignments: TeamBuildAssignment[];
  warnings: string[];
  balance_summary: Record<string, unknown>;
  audit_summary: string;
  lock_version: number;
  approved_at: string | null;
  published_at: string | null;
  provider_execution: "not_started";
}): TeamBuildPlanView {
  return {
    id: row.id,
    organizationId: row.organization_id,
    seasonId: row.season_id,
    division: row.division,
    targetRosterSize: row.target_roster_size,
    status: row.status,
    assignments: Array.isArray(row.assignments) ? row.assignments : [],
    friendRequests: Array.isArray(row.constraints?.friendRequests) ? row.constraints.friendRequests : [],
    warnings: row.warnings ?? [],
    balanceSummary: row.balance_summary ?? {},
    auditSummary: row.audit_summary,
    lockVersion: row.lock_version,
    approvedAt: row.approved_at ?? undefined,
    publishedAt: row.published_at ?? undefined,
    providerExecution: "not_started"
  };
}

function emptyWorkbench(message: string): TeamBuilderWorkbenchData {
  return {
    ok: false,
    message,
    organizationId: "",
    seasons: [],
    teams: [],
    inputs: [],
    plans: [],
    providerExecution: "not_started"
  };
}

export async function listTeamBuilderWorkbenchData(input: {
  actorUserId: string;
  organizationIds: string[];
}): Promise<TeamBuilderWorkbenchData> {
  const organizationId = [...new Set(input.organizationIds.filter(Boolean))][0] ?? "";
  if (!input.actorUserId || !organizationId) {
    return emptyWorkbench("An active organization administrator is required.");
  }
  try {
    const db = dbClient();
    const access = await requireActiveOrganizationAdmin({
      db,
      organizationId,
      userId: input.actorUserId,
      action: "open the team-builder workbench"
    });
    if (!access.ok) return emptyWorkbench(access.message);
    const [{ data: seasons }, { data: teams }, { data: plans, error }] = await withSupabaseTimeout(Promise.all([
      db.from("seasons")
        .select("id,name,status,organization_id")
        .eq("organization_id", organizationId)
        .order("starts_at", { ascending: false }),
      db.from("teams")
        .select("id,season_id,name,division,status,organization_id")
        .eq("organization_id", organizationId)
        .order("division", { ascending: true })
        .order("name", { ascending: true }),
      db.from("team_build_plans")
        .select(planColumns)
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false })
        .limit(25)
    ]), 7000) as [
      { data: Array<{ id: string; name: string; status: "active" | "archived"; organization_id: string }> | null },
      { data: Array<{ id: string; season_id: string; name: string; division: string; status?: "active" | "archived"; organization_id: string }> | null },
      { data: Parameters<typeof mapPlan>[0][] | null; error?: { message?: string } | null }
    ];
    if (error) return { ...emptyWorkbench("Team-builder plans are unavailable until the new migration is promoted."), organizationId };
    const activeSeason = (seasons ?? []).find((season) => season.status === "active");
    const privateInputs = activeSeason
      ? await readTeamBuilderInputs({
        organizationId,
        seasonId: activeSeason.id,
        actorUserId: input.actorUserId
      })
      : undefined;
    return {
      ok: true,
      message: activeSeason
        ? "Preview, edit, approve, and publish are local persisted admin actions. Hosted Supabase readback remains a separate acceptance gate."
        : "No active season is available for team building.",
      organizationId,
      seasons: seasons ?? [],
      teams: (teams ?? []).map((team) => ({
        id: team.id,
        seasonId: team.season_id,
        name: team.name,
        division: team.division,
        status: team.status ?? "active"
      })),
      inputs: privateInputs?.ok ? privateInputs.inputs : [],
      plans: (plans ?? []).map(mapPlan),
      providerExecution: "not_started"
    };
  } catch {
    return { ...emptyWorkbench("Team-builder workbench is unavailable until the new migration is promoted."), organizationId };
  }
}

async function loadRosterContext(input: SaveTeamBuildPlanInput) {
  const db = dbClient();
  const access = await requireActiveOrganizationAdmin({
    db,
    organizationId: input.organizationId,
    userId: input.actorUserId,
    action: input.planId ? "edit a team build plan" : "preview a team build plan"
  });
  if (!access.ok) return { ok: false as const, message: access.message };

  const [{ data: season }, { data: teams }, { data: players }] = await withSupabaseTimeout(Promise.all([
    db.from("seasons")
      .select("id,organization_id,status")
      .eq("id", input.seasonId)
      .eq("organization_id", input.organizationId)
      .maybeSingle(),
    db.from("teams")
      .select("id,name,division,season_id,organization_id,status")
      .eq("organization_id", input.organizationId)
      .eq("season_id", input.seasonId)
      .eq("division", input.division)
      .eq("status", "active"),
    db.from("players")
      .select("id,team_id,season_id,organization_id,first_name,last_initial,roster_status")
      .eq("organization_id", input.organizationId)
      .eq("season_id", input.seasonId)
      .eq("roster_status", "active")
  ]), 7000) as [
    { data: { id: string; organization_id: string; status: "active" | "archived" } | null },
    { data: Array<{ id: string; name: string; division: string; season_id: string; organization_id: string; status: "active" | "archived" }> | null },
    { data: Array<{ id: string; team_id: string; season_id: string; organization_id: string; first_name: string; last_initial: string; roster_status: string }> | null }
  ];
  if (!season || season.status !== "active") {
    return { ok: false as const, message: "Team builder requires an active season in the requested organization." };
  }
  const teamIds = new Set((teams ?? []).map((team) => team.id));
  const scopedPlayers = (players ?? []).filter((player) => teamIds.has(player.team_id));
  if (!teams?.length || !scopedPlayers.length) {
    return { ok: false as const, message: "Team builder requires active in-scope teams and rostered players." };
  }
  const playerIds = scopedPlayers.map((player) => player.id);
  const [{ data: guardians }, privateInputs] = await Promise.all([
    withSupabaseTimeout(db.from("player_guardians")
      .select("player_id,parent_user_id,status")
      .in("player_id", playerIds)
      .eq("status", "active"), 7000) as Promise<{
        data: Array<{ player_id: string; parent_user_id: string | null; status: string }> | null;
      }>,
    readTeamBuilderInputs({
      organizationId: input.organizationId,
      seasonId: input.seasonId,
      actorUserId: input.actorUserId
    })
  ]);
  if (!privateInputs.ok) return { ok: false as const, message: privateInputs.message };
  const guardianByPlayer = new Map((guardians ?? [])
    .filter((guardian) => guardian.parent_user_id)
    .map((guardian) => [guardian.player_id, guardian.parent_user_id!]));
  const roster: TeamBuilderRosterContext = {
    teams: teams.map((team) => ({ id: team.id, name: team.name, division: team.division })),
    players: scopedPlayers.map((player) => ({
      id: player.id,
      teamId: player.team_id,
      firstName: player.first_name,
      lastInitial: player.last_initial,
      guardianGroupId: guardianByPlayer.get(player.id)
    }))
  };
  return { ok: true as const, db, roster, privateInputs: privateInputs.inputs };
}

function validateFriendRequests(friendRequests: TeamBuildFriendRequest[], playerIds: Set<string>) {
  return friendRequests.every((request) => (
    request.playerId !== request.friendPlayerId
    && playerIds.has(request.playerId)
    && playerIds.has(request.friendPlayerId)
  ));
}

function assignmentsFromPreview(preview: BalancedTeamBuildPreview): TeamBuildAssignment[] {
  return preview.teams.flatMap((team) => team.players.map((player) => ({
    playerId: player.playerId,
    teamId: team.teamId
  })));
}

function summarizeAssignments(
  assignments: TeamBuildAssignment[],
  teams: TeamBuilderRosterContext["teams"],
  inputs: TeamBuilderPrivateInput[]
) {
  const inputByPlayer = new Map(inputs.map((item) => [item.playerId, item]));
  return {
    teams: teams.map((team) => {
      const playerIds = assignments.filter((assignment) => assignment.teamId === team.id).map((assignment) => assignment.playerId);
      const ratings = playerIds.map((playerId) => inputByPlayer.get(playerId)?.evaluationRating ?? 3);
      const ageBandCounts = playerIds.reduce<Record<string, number>>((counts, playerId) => {
        const ageBand = inputByPlayer.get(playerId)?.ageBand ?? team.division;
        counts[ageBand] = (counts[ageBand] ?? 0) + 1;
        return counts;
      }, {});
      return {
        teamId: team.id,
        teamName: team.name,
        playerCount: playerIds.length,
        averageEvaluation: ratings.length
          ? Math.round((ratings.reduce((total, rating) => total + rating, 0) / ratings.length) * 10) / 10
          : 0,
        ageBandCounts,
        missingProfileCount: playerIds.filter((playerId) => inputByPlayer.get(playerId)?.profileMissing).length,
        defaultedEvaluationCount: playerIds.filter((playerId) => inputByPlayer.get(playerId)?.evaluationDefaulted).length
      };
    })
  };
}

export async function saveTeamBuildPlan(input: SaveTeamBuildPlanInput) {
  if (!input.organizationId || !input.seasonId || !input.division.trim() || !input.actorUserId || !input.actionId) {
    return { ok: false, message: "Organization, season, division, verified administrator, and action identifier are required." };
  }
  if (!Number.isInteger(input.targetRosterSize) || input.targetRosterSize < 1 || input.targetRosterSize > 30) {
    return { ok: false, message: "Target roster size must be a whole number from 1 through 30." };
  }
  if (!Number.isInteger(input.expectedLockVersion) || input.expectedLockVersion < 0) {
    return { ok: false, message: "Expected plan version is required." };
  }
  try {
    const context = await loadRosterContext(input);
    if (!context.ok) return context;
    const playerIds = new Set(context.roster.players.map((player) => player.id));
    const teamIds = new Set(context.roster.teams.map((team) => team.id));
    const friendRequests = input.friendRequests ?? [];
    if (!validateFriendRequests(friendRequests, playerIds)) {
      return { ok: false, message: "Friend constraints must name two different in-scope players." };
    }
    const profiles = Object.fromEntries(context.privateInputs.map((item) => [item.playerId, {
      birthDate: item.birthDate,
      ageBand: item.ageBand,
      evaluationRating: item.evaluationRating
    }]));
    const preview = previewBalancedTeamBuildRoster(context.roster, {
      division: input.division.trim(),
      targetRosterSize: input.targetRosterSize,
      actorUserId: input.actorUserId,
      now: new Date().toISOString(),
      playerProfiles: profiles,
      friendRequests
    });
    if (!preview.ok) return { ok: false, message: preview.warnings[0] ?? "Team build preview could not be created." };
    const assignments = input.assignments ?? assignmentsFromPreview(preview);
    if (assignments.length !== playerIds.size
      || new Set(assignments.map((assignment) => assignment.playerId)).size !== playerIds.size
      || assignments.some((assignment) => !playerIds.has(assignment.playerId) || !teamIds.has(assignment.teamId))) {
      return { ok: false, message: "Edited assignments must place every in-scope player on exactly one in-scope team." };
    }
    const balanceSummary = summarizeAssignments(assignments, context.roster.teams, context.privateInputs);
    const missingProfiles = context.privateInputs.filter((item) => item.profileMissing).length;
    const defaultedEvaluations = context.privateInputs.filter((item) => item.evaluationDefaulted).length;
    const auditSummary = `Deterministic ${input.division.trim()} plan covers ${assignments.length} player(s) on ${context.roster.teams.length} team(s), with ${missingProfiles} missing profile(s), ${defaultedEvaluations} defaulted evaluation(s), ${friendRequests.length} friend constraint(s), and guardian/sibling groups retained.`;
    const { data, error } = await withSupabaseTimeout(context.db.rpc("save_team_build_plan", {
      target_plan_id: input.planId ?? null,
      target_organization_id: input.organizationId,
      target_season_id: input.seasonId,
      target_division: input.division.trim(),
      target_roster_size: input.targetRosterSize,
      target_constraints: {
        friendRequests,
        privateInputEvidence: context.privateInputs.map((item) => ({
          playerId: item.playerId,
          ageBand: item.ageBand ?? input.division.trim(),
          ageBandSource: item.ageBandDefaulted ? "division_default" : "explicit",
          evaluationRating: item.evaluationRating ?? 3,
          evaluationSource: item.evaluationDefaulted ? "defaulted" : "explicit",
          birthDateStatus: item.birthDate ? "recorded" : "missing"
        }))
      },
      target_assignments: assignments,
      target_warnings: preview.warnings,
      target_balance_summary: balanceSummary,
      target_audit_summary: auditSummary,
      target_actor_user_id: input.actorUserId,
      expected_lock_version: input.expectedLockVersion,
      target_action_id: input.actionId
    }), 7000) as {
      data: { ok: boolean; plan_id: string; status: TeamBuildPlanStatus; lock_version: number; idempotent: boolean; provider_execution: "not_started" } | null;
      error?: { message?: string } | null;
    };
    if (error || !data) {
      const conflict = /changed|version|editable|already/i.test(error?.message ?? "");
      return {
        ok: false,
        conflict,
        message: conflict ? "Plan changed in another review. Refresh before retrying." : "Team build plan could not be saved."
      };
    }
    return {
      ok: true,
      message: data.idempotent
        ? "This reviewed plan action was already saved; no duplicate change was made."
        : input.planId
          ? "Edited plan saved for administrator review."
          : "Deterministic preview saved for administrator review.",
      plan: {
        id: data.plan_id,
        status: data.status,
        lockVersion: data.lock_version
      },
      preview,
      assignments,
      balanceSummary,
      auditSummary,
      idempotent: data.idempotent,
      providerExecution: "not_started" as const
    };
  } catch {
    return { ok: false, message: "Team build plan is unavailable until the new migration is promoted." };
  }
}

async function transitionPlan(input: {
  planId: string;
  actorUserId: string;
  expectedLockVersion: number;
  actionId: string;
  action: "approve" | "publish";
}) {
  if (!input.planId || !input.actorUserId || !input.actionId
    || !Number.isInteger(input.expectedLockVersion) || input.expectedLockVersion < 1) {
    return { ok: false, message: "Plan, verified administrator, expected version, and action identifier are required." };
  }
  try {
    const rpcName = input.action === "approve" ? "approve_team_build_plan" : "publish_team_build_plan";
    const { data, error } = await withSupabaseTimeout(dbClient().rpc(rpcName, {
      target_plan_id: input.planId,
      target_actor_user_id: input.actorUserId,
      expected_lock_version: input.expectedLockVersion,
      target_action_id: input.actionId
    }), 7000) as {
      data: {
        ok: boolean;
        plan_id: string;
        status: TeamBuildPlanStatus;
        lock_version: number;
        idempotent: boolean;
        updated_assignments?: number;
        provider_execution: "not_started";
      } | null;
      error?: { message?: string } | null;
    };
    if (error || !data) {
      const conflict = /changed|version|already|approved|published|refresh/i.test(error?.message ?? "");
      return {
        ok: false,
        conflict,
        message: conflict
          ? "Plan changed or is no longer in the expected review state. Refresh before retrying."
          : `Team build plan could not be ${input.action === "approve" ? "approved" : "published"}.`
      };
    }
    return {
      ok: true,
      message: data.idempotent
        ? `This ${input.action} action was already recorded; no duplicate change was made.`
        : input.action === "approve"
          ? "Plan approved with immutable assignment evidence."
          : `${data.updated_assignments ?? 0} approved assignment(s) published atomically. No provider message was sent.`,
      plan: {
        id: data.plan_id,
        status: data.status,
        lockVersion: data.lock_version
      },
      idempotent: data.idempotent,
      providerExecution: "not_started" as const
    };
  } catch {
    return { ok: false, message: `Team build plan could not be ${input.action === "approve" ? "approved" : "published"}.` };
  }
}

export function approveTeamBuildPlan(input: {
  planId: string;
  actorUserId: string;
  expectedLockVersion: number;
  actionId: string;
}) {
  return transitionPlan({ ...input, action: "approve" });
}

export function publishTeamBuildPlan(input: {
  planId: string;
  actorUserId: string;
  expectedLockVersion: number;
  actionId: string;
}) {
  return transitionPlan({ ...input, action: "publish" });
}
