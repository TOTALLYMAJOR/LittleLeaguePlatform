import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Migration 0032 intentionally leads generated database types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(name: string, parameters: Record<string, unknown>): any;
};

export type SeasonTransitionState =
  | "awaiting_guardian_review"
  | "guardian_accepted"
  | "guardian_declined"
  | "applied"
  | "cancelled"
  | "expired"
  | "reverted";

export interface SeasonTransitionView {
  id: string;
  sourcePlayerId: string;
  childLabel: string;
  sourceTeamName: string;
  sourceSeasonName: string;
  targetTeamName: string;
  targetSeasonName: string;
  state: SeasonTransitionState;
  carryForwardFields: string[];
  resetRequiredFields: string[];
  proposalReason: string;
  expiresAt: string;
  lockVersion: number;
  guardianDecision?: "pending" | "accepted" | "declined";
  guardianReviewCount: number;
  guardianAcceptedCount: number;
  targetPlayerId?: string;
}

export interface ParentSeasonTransitionData {
  ok: boolean;
  message: string;
  transitions: SeasonTransitionView[];
}

export interface AdminSeasonTransitionData extends ParentSeasonTransitionData {
  sourcePlayers: Array<{ id: string; childLabel: string; teamId: string; teamName: string; seasonName: string }>;
  targetTeams: Array<{ id: string; teamName: string; seasonName: string }>;
}

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

async function hydrateTransitions(
  db: UnsafeSupabase,
  rows: Array<{
    id: string;
    source_player_id: string;
    source_team_id: string;
    source_season_id: string;
    target_team_id: string;
    target_season_id: string;
    target_player_id: string | null;
    state: SeasonTransitionState;
    carry_forward_fields: string[];
    reset_required_fields: string[];
    proposal_reason: string;
    expires_at: string;
    lock_version: number;
  }>,
  viewerGuardianId?: string
): Promise<SeasonTransitionView[]> {
  if (!rows.length) return [];
  const playerIds = [...new Set(rows.map((row) => row.source_player_id))];
  const teamIds = [...new Set(rows.flatMap((row) => [row.source_team_id, row.target_team_id]))];
  const seasonIds = [...new Set(rows.flatMap((row) => [row.source_season_id, row.target_season_id]))];
  const [{ data: players }, { data: teams }, { data: seasons }, { data: reviews }] = await withSupabaseTimeout(Promise.all([
    db.from("players").select("id,first_name,last_initial").in("id", playerIds),
    db.from("teams").select("id,name").in("id", teamIds),
    db.from("seasons").select("id,name").in("id", seasonIds),
    db.from("season_transition_guardian_reviews")
      .select("transition_id,guardian_user_id,decision")
      .in("transition_id", rows.map((row) => row.id))
  ]), 7000) as [
    { data: Array<{ id: string; first_name: string; last_initial: string }> | null },
    { data: Array<{ id: string; name: string }> | null },
    { data: Array<{ id: string; name: string }> | null },
    { data: Array<{ transition_id: string; guardian_user_id: string; decision: "pending" | "accepted" | "declined" }> | null }
  ];
  const playerById = new Map((players ?? []).map((player) => [player.id, player]));
  const teamById = new Map((teams ?? []).map((team) => [team.id, team.name]));
  const seasonById = new Map((seasons ?? []).map((season) => [season.id, season.name]));
  return rows.map((row) => {
    const player = playerById.get(row.source_player_id);
    const guardianReviews = (reviews ?? []).filter((review) => review.transition_id === row.id);
    const state = (
      (row.state === "awaiting_guardian_review" || row.state === "guardian_accepted")
      && Date.parse(row.expires_at) <= Date.now()
    ) ? "expired" : row.state;
    return {
      id: row.id,
      sourcePlayerId: row.source_player_id,
      childLabel: player ? `${player.first_name} ${player.last_initial}.` : "Linked child",
      sourceTeamName: teamById.get(row.source_team_id) ?? "Current team",
      sourceSeasonName: seasonById.get(row.source_season_id) ?? "Current season",
      targetTeamName: teamById.get(row.target_team_id) ?? "New team",
      targetSeasonName: seasonById.get(row.target_season_id) ?? "New season",
      state,
      carryForwardFields: row.carry_forward_fields,
      resetRequiredFields: row.reset_required_fields,
      proposalReason: row.proposal_reason,
      expiresAt: row.expires_at,
      lockVersion: row.lock_version,
      guardianDecision: viewerGuardianId
        ? guardianReviews.find((review) => review.guardian_user_id === viewerGuardianId)?.decision
        : undefined,
      guardianReviewCount: guardianReviews.length,
      guardianAcceptedCount: guardianReviews.filter((review) => review.decision === "accepted").length,
      targetPlayerId: row.target_player_id ?? undefined
    };
  });
}

const transitionColumns = [
  "id", "source_player_id", "source_team_id", "source_season_id",
  "target_team_id", "target_season_id", "target_player_id", "state",
  "carry_forward_fields", "reset_required_fields", "proposal_reason",
  "expires_at", "lock_version"
].join(",");

export async function listParentSeasonTransitions(parentUserId: string): Promise<ParentSeasonTransitionData> {
  if (!parentUserId) return { ok: false, message: "Signed-in guardian access is required.", transitions: [] };
  try {
    const db = dbClient();
    const { data: reviewRows, error } = await withSupabaseTimeout(db
      .from("season_transition_guardian_reviews")
      .select("transition_id")
      .eq("guardian_user_id", parentUserId), 7000) as {
        data: Array<{ transition_id: string }> | null;
        error?: { message?: string } | null;
      };
    if (error) {
      return { ok: false, message: "Season-change review will appear after the transition migration is promoted.", transitions: [] };
    }
    const ids = [...new Set((reviewRows ?? []).map((review) => review.transition_id))];
    if (!ids.length) return { ok: true, message: "No season or team change needs your review.", transitions: [] };
    const { data: rows } = await withSupabaseTimeout(db
      .from("season_transition_reviews")
      .select(transitionColumns)
      .in("id", ids)
      .order("created_at", { ascending: false }), 7000) as { data: Parameters<typeof hydrateTransitions>[1] | null };
    return {
      ok: true,
      message: "Showing team and season changes that name you as a current guardian reviewer.",
      transitions: await hydrateTransitions(db, rows ?? [], parentUserId)
    };
  } catch {
    return { ok: false, message: "Season-change review is unavailable.", transitions: [] };
  }
}

export async function listAdminSeasonTransitions(organizationIds: string[]): Promise<AdminSeasonTransitionData> {
  const ids = [...new Set(organizationIds.filter(Boolean))];
  if (!ids.length) return { ok: false, message: "League administrator access is required.", transitions: [], sourcePlayers: [], targetTeams: [] };
  try {
    const db = dbClient();
    const [{ data: rows, error }, { data: players }, { data: teams }, { data: seasons }] = await withSupabaseTimeout(Promise.all([
      db.from("season_transition_reviews").select(transitionColumns).in("organization_id", ids).order("created_at", { ascending: false }).limit(100),
      db.from("players").select("id,team_id,season_id,first_name,last_initial,roster_status").in("organization_id", ids),
      db.from("teams").select("id,season_id,name,status").in("organization_id", ids),
      db.from("seasons").select("id,name,status").in("organization_id", ids)
    ]), 7000) as [
      { data: Parameters<typeof hydrateTransitions>[1] | null; error?: { message?: string } | null },
      { data: Array<{ id: string; team_id: string; season_id: string; first_name: string; last_initial: string; roster_status?: string | null }> | null },
      { data: Array<{ id: string; season_id: string; name: string; status: "active" | "archived" }> | null },
      { data: Array<{ id: string; name: string; status: "active" | "archived" }> | null }
    ];
    const teamById = new Map((teams ?? []).map((team) => [team.id, team]));
    const seasonById = new Map((seasons ?? []).map((season) => [season.id, season]));
    return {
      ok: !error,
      message: error
        ? "Season-change workflow will appear after the transition migration is promoted."
        : "Showing privacy-minimized season and team change reviews.",
      transitions: error ? [] : await hydrateTransitions(db, rows ?? []),
      sourcePlayers: (players ?? [])
        .filter((player) => (
          (player.roster_status ?? "active") === "active"
          && teamById.get(player.team_id)?.status === "active"
          && seasonById.get(player.season_id)?.status === "active"
        ))
        .map((player) => ({
          id: player.id,
          childLabel: `${player.first_name} ${player.last_initial}.`,
          teamId: player.team_id,
          teamName: teamById.get(player.team_id)?.name ?? "Team",
          seasonName: seasonById.get(player.season_id)?.name ?? "Season"
        })),
      targetTeams: (teams ?? [])
        .filter((team) => team.status === "active" && seasonById.get(team.season_id)?.status === "active")
        .map((team) => ({
          id: team.id,
          teamName: team.name,
          seasonName: seasonById.get(team.season_id)?.name ?? "Season"
        }))
    };
  } catch {
    return { ok: false, message: "Season-change workflow is unavailable.", transitions: [], sourcePlayers: [], targetTeams: [] };
  }
}

async function rpc(name: string, parameters: Record<string, unknown>, fallback: string) {
  try {
    const { data, error } = await withSupabaseTimeout(dbClient().rpc(name, parameters), 7000) as {
      data: Record<string, unknown> | null;
      error?: { message?: string } | null;
    };
    if (error || !data) return { ok: false, message: fallback };
    return { ...data, message: "Season-change review updated. No provider message was sent." };
  } catch {
    return { ok: false, message: fallback };
  }
}

export function proposeSeasonTransition(input: {
  sourcePlayerId: string; targetTeamId: string; actorUserId: string; reason: string; expiresAt: string;
}) {
  return rpc("propose_season_transition", {
    target_source_player_id: input.sourcePlayerId,
    target_team_id: input.targetTeamId,
    proposing_user_id: input.actorUserId,
    target_reason: input.reason,
    target_expires_at: input.expiresAt
  }, "Season change could not be proposed.");
}

export function respondToSeasonTransition(input: {
  transitionId: string; actorUserId: string; decision: "accepted" | "declined"; note: string; expectedLockVersion: number;
}) {
  return rpc("respond_to_season_transition", {
    target_transition_id: input.transitionId,
    responding_guardian_user_id: input.actorUserId,
    target_decision: input.decision,
    target_note: input.note,
    expected_lock_version: input.expectedLockVersion
  }, "Guardian response could not be saved.");
}

export function applySeasonTransition(input: {
  transitionId: string; actorUserId: string; expectedLockVersion: number;
}) {
  return rpc("apply_season_transition", {
    target_transition_id: input.transitionId,
    applying_user_id: input.actorUserId,
    expected_lock_version: input.expectedLockVersion
  }, "Reviewed season change could not be applied.");
}

export function closeSeasonTransition(input: {
  transitionId: string; actorUserId: string; reason: string; expectedLockVersion: number;
}) {
  return rpc("close_season_transition", {
    target_transition_id: input.transitionId,
    closing_user_id: input.actorUserId,
    target_reason: input.reason,
    expected_lock_version: input.expectedLockVersion
  }, "Season-change review could not be closed.");
}

export function revertSeasonTransition(input: {
  transitionId: string; actorUserId: string; reason: string;
}) {
  return rpc("revert_season_transition", {
    target_transition_id: input.transitionId,
    reverting_user_id: input.actorUserId,
    target_reason: input.reason
  }, "Applied season change could not be corrected.");
}
