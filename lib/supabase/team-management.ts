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
    status: "active" | "archived";
    coachUserId?: string;
    rosterCount: number;
    mascot: string;
    themeKey: ProgramThemeKey;
  }>;
  players: Array<{
    id: string;
    teamId: string;
    seasonId: string;
    firstName: string;
    lastInitial: string;
    jersey: string;
    rosterStatus: "active" | "inactive" | "archived";
  }>;
  coaches: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  seasons: Array<{
    id: string;
    name: string;
    status: "active" | "archived";
    startsAt?: string;
    endsAt?: string;
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
  coachUserId?: string;
  status?: "active" | "archived";
}

export interface SaveAdminSeasonInput {
  organizationId: string;
  actorUserId: string;
  seasonId?: string;
  name: string;
  startsAt: string;
  endsAt: string;
  status?: "active" | "archived";
}

export interface SaveRosterPlayerInput {
  organizationId: string;
  actorUserId: string;
  playerId?: string;
  teamId: string;
  seasonId: string;
  firstName: string;
  lastInitial: string;
  jersey?: string;
  rosterStatus?: "active" | "inactive" | "archived";
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
      status: "active",
      coachUserId: team.coachUserId,
      rosterCount: seedState.players.filter((player) => player.teamId === team.id).length,
      mascot: team.mascot,
      themeKey: team.themeKey
    })),
    players: seedState.players.map((player) => ({
      id: player.id,
      teamId: player.teamId,
      seasonId: player.seasonId,
      firstName: player.firstName,
      lastInitial: player.lastInitial,
      jersey: player.jersey,
      rosterStatus: "active"
    })),
    coaches: seedState.users
      .filter((user) => user.role === "coach" || user.role === "admin")
      .map((user) => ({ id: user.id, name: user.name, email: user.email })),
    seasons: [{
      id: seedState.activeSeason.id,
      name: seedState.activeSeason.name,
      status: seedState.activeSeason.status,
      startsAt: seedState.activeSeason.startsAt,
      endsAt: seedState.activeSeason.endsAt
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
      { data: teams },
      { data: players },
      { data: coaches }
    ] = await withSupabaseTimeout(Promise.all([
      db.from("organizations").select("id,name").limit(1),
      db.from("seasons").select("id,name,status,starts_at,ends_at").order("starts_at", { ascending: false }),
      db.from("teams").select("id,name,division,season_id,coach_user_id,mascot,theme_key,status").order("division", { ascending: true }).order("name", { ascending: true }),
      db.from("players").select("id,team_id,season_id,first_name,last_initial,jersey,roster_status").order("first_name", { ascending: true }),
      db.from("profiles").select("id,display_name,email,default_role").in("default_role", ["coach", "admin"]).order("display_name", { ascending: true })
    ]), 7000) as [
      { data: Array<{ id: string; name: string }> | null },
      { data: Array<{ id: string; name: string; status: "active" | "archived"; starts_at: string; ends_at: string }> | null },
      { data: Array<{ id: string; name: string; division: string; season_id: string; coach_user_id: string | null; mascot: string; theme_key: ProgramThemeKey; status?: "active" | "archived" }> | null },
      { data: Array<{ id: string; team_id: string; season_id: string; first_name: string; last_initial: string; jersey: string | null; roster_status?: "active" | "inactive" | "archived" }> | null },
      { data: Array<{ id: string; display_name: string; email: string; default_role: "admin" | "coach" | "parent" }> | null }
    ];

    const organization = organizations?.[0];
    if (!organization || !seasons?.length || !teams) return fallbackTeamManagementData();
    const seasonById = new Map(seasons.map((season) => [season.id, season]));
    const rosterCountByTeamId = new Map<string, number>();
    for (const player of players ?? []) {
      rosterCountByTeamId.set(player.team_id, (rosterCountByTeamId.get(player.team_id) ?? 0) + 1);
    }

    return {
      organizationId: organization.id,
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        division: team.division,
        seasonId: team.season_id,
        seasonName: seasonById.get(team.season_id)?.name ?? "Unknown season",
        seasonStatus: seasonById.get(team.season_id)?.status ?? "active",
        status: team.status ?? "active",
        coachUserId: team.coach_user_id ?? undefined,
        rosterCount: rosterCountByTeamId.get(team.id) ?? 0,
        mascot: team.mascot,
        themeKey: team.theme_key
      })),
      players: (players ?? []).map((player) => ({
        id: player.id,
        teamId: player.team_id,
        seasonId: player.season_id,
        firstName: player.first_name,
        lastInitial: player.last_initial,
        jersey: player.jersey ?? "TBD",
        rosterStatus: player.roster_status ?? "active"
      })),
      coaches: (coaches ?? []).map((coach) => ({
        id: coach.id,
        name: coach.display_name,
        email: coach.email
      })),
      seasons: seasons.map((season) => ({
        id: season.id,
        name: season.name,
        status: season.status,
        startsAt: season.starts_at,
        endsAt: season.ends_at
      })),
      divisions: Array.from(new Set(teams.map((team) => team.division))).sort(),
      message: "Showing Supabase team, division, and season setup records."
    };
  } catch {
    return fallbackTeamManagementData();
  }
}

export async function saveAdminSeason(input: SaveAdminSeasonInput) {
  const name = input.name.trim();
  if (!input.organizationId || !input.actorUserId || !name || !input.startsAt || !input.endsAt) {
    return { ok: false, message: "Season setup requires organization, admin, name, start, and end dates." };
  }

  if (new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
    return { ok: false, message: "Season end must be after season start." };
  }

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const access = await requireActiveOrganizationAdmin({
      db,
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "manage organization seasons"
    });
    if (!access.ok) return { ok: false, message: access.message };

    const archivedAt = input.status === "archived" ? new Date().toISOString() : null;
    const { data: season, error } = await withSupabaseTimeout(db
      .from("seasons")
      .upsert({
        ...(input.seasonId ? { id: input.seasonId } : {}),
        organization_id: input.organizationId,
        name,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        status: input.status ?? "active",
        archived_at: archivedAt
      })
      .select("id,name,status,starts_at,ends_at,archived_at")
      .single(), 7000) as {
        data: { id: string; name: string; status: "active" | "archived"; starts_at: string; ends_at: string; archived_at: string | null } | null;
        error: { message?: string } | null;
      };

    if (error || !season) return { ok: false, message: "Season setup could not be saved." };

    await withSupabaseTimeout(db.from("audit_events").insert({
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId,
      action: input.status === "archived" ? "season_archived" : input.seasonId ? "season_updated" : "season_created",
      target_type: "season",
      target_id: season.id,
      summary: `${season.name} saved with ${season.status} lifecycle status.`
    }), 7000);

    return { ok: true, message: "Season setup saved by an active organization admin.", season };
  } catch {
    return { ok: false, message: "Season setup could not reach Supabase." };
  }
}

export async function saveRosterPlayer(input: SaveRosterPlayerInput) {
  const firstName = input.firstName.trim();
  const lastInitial = input.lastInitial.trim().slice(0, 2);
  if (!input.organizationId || !input.actorUserId || !input.teamId || !input.seasonId || !firstName || !lastInitial) {
    return { ok: false, message: "Roster player requires organization, admin, team, season, first name, and last initial." };
  }

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const access = await requireActiveOrganizationAdmin({
      db,
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "manage roster lifecycle"
    });
    if (!access.ok) return { ok: false, message: access.message };

    const [{ data: season }, { data: team }] = await withSupabaseTimeout(Promise.all([
      db.from("seasons").select("id,status").eq("id", input.seasonId).single(),
      db.from("teams").select("id,organization_id,season_id").eq("id", input.teamId).single()
    ]), 7000) as [
      { data: { id: string; status: "active" | "archived" } | null },
      { data: { id: string; organization_id: string; season_id: string } | null }
    ];

    if (!season || season.status === "archived") return { ok: false, message: "Archived seasons are read-only for roster lifecycle changes." };
    if (!team || team.organization_id !== input.organizationId || team.season_id !== input.seasonId) {
      return { ok: false, message: "Roster player must belong to the selected organization, season, and team." };
    }

    const { data: player, error } = await withSupabaseTimeout(db
      .from("players")
      .upsert({
        ...(input.playerId ? { id: input.playerId } : {}),
        organization_id: input.organizationId,
        season_id: input.seasonId,
        team_id: input.teamId,
        first_name: firstName,
        last_initial: lastInitial,
        jersey: input.jersey?.trim() || null,
        roster_status: input.rosterStatus ?? "active"
      })
      .select("id,team_id,season_id,first_name,last_initial,jersey,roster_status")
      .single(), 7000) as {
        data: { id: string; team_id: string; season_id: string; first_name: string; last_initial: string; jersey: string | null; roster_status: "active" | "inactive" | "archived" } | null;
        error: { message?: string } | null;
      };

    if (error || !player) return { ok: false, message: "Roster player could not be saved." };

    await withSupabaseTimeout(db.from("audit_events").insert({
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId,
      action: input.playerId ? "roster_player_updated" : "roster_player_created",
      target_type: "player",
      target_id: player.id,
      summary: `${player.first_name} ${player.last_initial}. saved to roster with ${player.roster_status} status.`
    }), 7000);

    return { ok: true, message: "Roster lifecycle saved by an active organization admin.", player };
  } catch {
    return { ok: false, message: "Roster lifecycle could not reach Supabase." };
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
      secondary_color: input.secondaryColor,
      coach_user_id: input.coachUserId || null,
      status: input.status ?? "active",
      archived_at: input.status === "archived" ? new Date().toISOString() : null
    };

    const { data: team, error } = await withSupabaseTimeout(db
      .from("teams")
      .upsert(payload)
      .select("id,name,division,season_id,coach_user_id,mascot,theme_key,status,archived_at")
      .single(), 7000) as {
        data: { id: string; name: string; division: string; season_id: string; coach_user_id: string | null; mascot: string; theme_key: ProgramThemeKey; status: "active" | "archived"; archived_at: string | null } | null;
        error: { message?: string } | null;
      };

    if (error || !team) return { ok: false, message: "Team setup could not be saved." };

    await withSupabaseTimeout(db.from("audit_events").insert({
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId,
      action: input.status === "archived" ? "team_archived" : input.teamId ? "team_updated" : "team_created",
      target_type: "team",
      target_id: team.id,
      summary: `${team.name} saved in ${division} for season ${input.seasonId} with ${team.status} lifecycle status.`
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
