import { requireActiveOrganizationAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // The timestamped team-builder migration intentionally leads generated types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(name: string, parameters: Record<string, unknown>): any;
};

export interface TeamBuilderPrivateInput {
  playerId: string;
  playerLabel: string;
  organizationId: string;
  seasonId: string;
  teamId: string;
  birthDate: string | null;
  ageBand: string | null;
  evaluationRating: number | null;
  profileMissing: boolean;
  ageBandDefaulted: boolean;
  evaluationDefaulted: boolean;
}

export interface TeamBuilderInputsData {
  ok: boolean;
  message: string;
  organizationId: string;
  seasonId: string;
  inputs: TeamBuilderPrivateInput[];
  providerExecution: "not_started";
}

export interface SaveTeamBuilderInput {
  organizationId: string;
  seasonId: string;
  playerId: string;
  actorUserId: string;
  birthDate?: string | null;
  ageBand?: string | null;
  evaluationRating?: number | null;
}

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

function normalizePrivateInput(input: SaveTeamBuilderInput) {
  const birthDate = input.birthDate?.trim() || null;
  const ageBand = input.ageBand?.trim().toUpperCase() || null;
  const evaluationRating = input.evaluationRating ?? null;
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return { ok: false as const, message: "Birth date must use YYYY-MM-DD." };
  }
  if (birthDate && (Number.isNaN(Date.parse(`${birthDate}T00:00:00Z`)) || birthDate > new Date().toISOString().slice(0, 10))) {
    return { ok: false as const, message: "Birth date must be a real date that is not in the future." };
  }
  if (ageBand && !/^\d{1,2}U$/.test(ageBand)) {
    return { ok: false as const, message: "Age band must be an explicit value such as 8U or 12U." };
  }
  if (evaluationRating !== null && (!Number.isInteger(evaluationRating) || evaluationRating < 1 || evaluationRating > 5)) {
    return { ok: false as const, message: "Player evaluation must be a whole number from 1 through 5." };
  }
  return { ok: true as const, birthDate, ageBand, evaluationRating };
}

export async function readTeamBuilderInputs(input: {
  organizationId: string;
  seasonId: string;
  actorUserId: string;
}): Promise<TeamBuilderInputsData> {
  const empty: TeamBuilderInputsData = {
    ok: false,
    message: "Organization, season, and verified administrator are required.",
    organizationId: input.organizationId,
    seasonId: input.seasonId,
    inputs: [],
    providerExecution: "not_started"
  };
  if (!input.organizationId || !input.seasonId || !input.actorUserId) return empty;

  try {
    const db = dbClient();
    const access = await requireActiveOrganizationAdmin({
      db,
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "read private team-builder inputs"
    });
    if (!access.ok) return { ...empty, message: access.message };

    const [{ data: season }, { data: players }, { data: profiles }] = await withSupabaseTimeout(Promise.all([
      db.from("seasons")
        .select("id,organization_id,status")
        .eq("id", input.seasonId)
        .eq("organization_id", input.organizationId)
        .maybeSingle(),
      db.from("players")
        .select("id,organization_id,season_id,team_id,first_name,last_initial")
        .eq("organization_id", input.organizationId)
        .eq("season_id", input.seasonId)
        .order("first_name", { ascending: true })
        .order("id", { ascending: true }),
      db.from("player_team_builder_profiles")
        .select("player_id,organization_id,season_id,birth_date,age_band,evaluation_rating")
        .eq("organization_id", input.organizationId)
        .eq("season_id", input.seasonId)
    ]), 7000) as [
      { data: { id: string; organization_id: string; status: "active" | "archived" } | null },
      { data: Array<{ id: string; organization_id: string; season_id: string; team_id: string; first_name: string; last_initial: string }> | null },
      { data: Array<{ player_id: string; organization_id: string; season_id: string; birth_date: string | null; age_band: string | null; evaluation_rating: number | null }> | null }
    ];
    if (!season) return { ...empty, message: "Season does not belong to the requested organization." };
    const profileByPlayer = new Map((profiles ?? []).map((profile) => [profile.player_id, profile]));
    const inputs = (players ?? []).map((player) => {
      const profile = profileByPlayer.get(player.id);
      return {
        playerId: player.id,
        playerLabel: `${player.first_name} ${player.last_initial}.`,
        organizationId: player.organization_id,
        seasonId: player.season_id,
        teamId: player.team_id,
        birthDate: profile?.birth_date ?? null,
        ageBand: profile?.age_band ?? null,
        evaluationRating: profile?.evaluation_rating ?? null,
        profileMissing: !profile,
        ageBandDefaulted: !profile?.age_band,
        evaluationDefaulted: profile?.evaluation_rating == null
      };
    });
    return {
      ok: true,
      message: inputs.length
        ? "Private team-builder inputs are visible only to active organization administrators."
        : "No rostered players are available for private team-builder inputs.",
      organizationId: input.organizationId,
      seasonId: input.seasonId,
      inputs,
      providerExecution: "not_started"
    };
  } catch {
    return { ...empty, message: "Private team-builder inputs are unavailable until the new migration is promoted." };
  }
}

export async function saveTeamBuilderInput(input: SaveTeamBuilderInput) {
  if (!input.organizationId || !input.seasonId || !input.playerId || !input.actorUserId) {
    return { ok: false, message: "Organization, season, player, and verified administrator are required." };
  }
  const normalized = normalizePrivateInput(input);
  if (!normalized.ok) return normalized;

  try {
    const db = dbClient();
    const access = await requireActiveOrganizationAdmin({
      db,
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "change private team-builder inputs"
    });
    if (!access.ok) return { ok: false, message: access.message };

    const { data: profile, error } = await withSupabaseTimeout(db.rpc(
      "save_player_team_builder_profile",
      {
        target_organization_id: input.organizationId,
        target_season_id: input.seasonId,
        target_player_id: input.playerId,
        target_actor_user_id: input.actorUserId,
        target_birth_date: normalized.birthDate,
        target_age_band: normalized.ageBand,
        target_evaluation_rating: normalized.evaluationRating
      }
    ), 7000) as {
        data: {
          ok: boolean;
          player_id: string;
          birth_date: string | null;
          age_band: string | null;
          evaluation_rating: number | null;
        } | null;
        error?: { message?: string } | null;
      };
    if (error || !profile?.ok) {
      return { ok: false, message: "Private team-builder input could not be saved." };
    }

    return {
      ok: true,
      message: "Private input saved for deterministic preview. No parent view or provider delivery was created.",
      profile: {
        playerId: profile.player_id,
        birthDate: profile.birth_date,
        ageBand: profile.age_band,
        evaluationRating: profile.evaluation_rating
      },
      providerExecution: "not_started" as const
    };
  } catch {
    return { ok: false, message: "Private team-builder input is unavailable until the new migration is promoted." };
  }
}
