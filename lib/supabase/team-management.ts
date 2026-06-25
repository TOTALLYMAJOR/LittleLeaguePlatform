import { seedState, type ProgramThemeKey } from "@/lib/domain";
import { requireActiveOrganizationAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Team management spans staged admin tables; keep dynamic until generated
  // Supabase types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export interface AdminTeamManagementData {
  organizationId: string;
  teams: Array<{
    id: string;
    name: string;
    division: string;
    seasonId: string;
    seasonName: string;
    seasonStatus: "active" | "archived";
    mascot: string;
    themeKey: ProgramThemeKey;
  }>;
  seasons: Array<{
    id: string;
    name: string;
    status: "active" | "archived";
  }>;
  divisions: string[];
  message: string;
}

export interface SaveAdminTeamInput {
  organizationId: string;
  actorUserId: string;
  teamId?: string;
  seasonId: string;
  name: string;
  division: string;
  mascot: string;
  themeKey: ProgramThemeKey;
  primaryColor: string;
  secondaryColor: string;
}

function fallbackTeamManagementData(): AdminTeamManagementData {
  const seasonById = new Map([[seedState.activeSeason.id, seedState.activeSeason]]);
  return {
    organizationId: seedState.organization.id,
    teams: seedState.teams.map((team) => ({
      id: team.id,
      name: team.name,
      division: team.division,
      seasonId: team.seasonId,
      seasonName: seasonById.get(team.seasonId)?.name ?? seedState.activeSeason.name,
      seasonStatus: seasonById.get(team.seasonId)?.status ?? seedState.activeSeason.status,
      mascot: team.mascot,
      themeKey: team.themeKey
    })),
    seasons: [{
      id: seedState.activeSeason.id,
      name: seedState.activeSeason.name,
      status: seedState.activeSeason.status
    }],
    divisions: Array.from(new Set(seedState.teams.map((team) => team.division))).sort(),
    message: "Showing local team setup records until Supabase team rows are available."
  };
}

export async function listAdminTeamManagementData(): Promise<AdminTeamManagementData> {
  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const [
      { data: organizations },
      { data: seasons },
      { data: teams }
    ] = await withSupabaseTimeout(Promise.all([
      db.from("organizations").select("id,name").limit(1),
      db.from("seasons").select("id,name,status").order("starts_at", { ascending: false }),
      db.from("teams").select("id,name,division,season_id,mascot,theme_key").order("division", { ascending: true }).order("name", { ascending: true })
    ]), 7000) as [
      { data: Array<{ id: string; name: string }> | null },
      { data: Array<{ id: string; name: string; status: "active" | "archived" }> | null },
      { data: Array<{ id: string; name: string; division: string; season_id: string; mascot: string; theme_key: ProgramThemeKey }> | null }
    ];

    const organization = organizations?.[0];
    if (!organization || !seasons?.length || !teams) return fallbackTeamManagementData();
    const seasonById = new Map(seasons.map((season) => [season.id, season]));

    return {
      organizationId: organization.id,
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        division: team.division,
        seasonId: team.season_id,
        seasonName: seasonById.get(team.season_id)?.name ?? "Unknown season",
        seasonStatus: seasonById.get(team.season_id)?.status ?? "active",
        mascot: team.mascot,
        themeKey: team.theme_key
      })),
      seasons,
      divisions: Array.from(new Set(teams.map((team) => team.division))).sort(),
      message: "Showing Supabase team, division, and season setup records."
    };
  } catch {
    return fallbackTeamManagementData();
  }
}

export async function saveAdminTeam(input: SaveAdminTeamInput) {
  const name = input.name.trim();
  const division = input.division.trim();
  const mascot = input.mascot.trim();
  if (!input.organizationId || !input.actorUserId || !input.seasonId || !name || !division || !mascot) {
    return { ok: false, message: "Team setup requires organization, admin, season, name, division, and mascot." };
  }

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const access = await requireActiveOrganizationAdmin({
      db,
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "manage organization teams"
    });
    if (!access.ok) return { ok: false, message: access.message };

    const payload = {
      ...(input.teamId ? { id: input.teamId } : {}),
      organization_id: input.organizationId,
      season_id: input.seasonId,
      name,
      division,
      mascot,
      theme_key: input.themeKey,
      primary_color: input.primaryColor,
      secondary_color: input.secondaryColor
    };

    const { data: team, error } = await withSupabaseTimeout(db
      .from("teams")
      .upsert(payload)
      .select("id,name,division,season_id,mascot,theme_key")
      .single(), 7000) as {
        data: { id: string; name: string; division: string; season_id: string; mascot: string; theme_key: ProgramThemeKey } | null;
        error: { message?: string } | null;
      };

    if (error || !team) return { ok: false, message: "Team setup could not be saved." };

    await withSupabaseTimeout(db.from("audit_events").insert({
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId,
      action: input.teamId ? "team_updated" : "team_created",
      target_type: "team",
      target_id: team.id,
      summary: `${team.name} saved in ${division} for season ${input.seasonId}.`
    }), 7000);

    return {
      ok: true,
      message: "Team setup saved by an active organization admin.",
      team
    };
  } catch {
    return { ok: false, message: "Team setup could not reach Supabase." };
  }
}
