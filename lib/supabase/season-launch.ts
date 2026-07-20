import type { Team } from "@/lib/domain";
import { requireActiveOrganizationAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Season launch spans staged import provenance columns and RPCs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(name: string, parameters: Record<string, unknown>): any;
};

export interface SeasonLaunchImport {
  id: string;
  organizationId: string;
  seasonId: string;
  filename: string;
  status: "uploaded" | "validated" | "committed" | "failed";
  totalRows: number;
  warningRows: number;
  errorRows: number;
  committedAt?: string;
  rolledBackAt?: string;
  manifest: Record<string, unknown>;
  createdAt: string;
}

export interface SeasonLaunchTenant {
  organizationId: string;
  organizationName: string;
  seasonId: string;
  seasonName: string;
  teams: Team[];
  assignedCoachCount: number;
  scheduledEventCount: number;
  providerSendsEnabled: boolean;
  imports: SeasonLaunchImport[];
}

export interface SeasonLaunchData {
  tenants: SeasonLaunchTenant[];
  source: "supabase" | "unavailable";
  message: string;
}

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

export async function listSeasonLaunchData(input: {
  organizationIds: string[];
}): Promise<SeasonLaunchData> {
  const organizationIds = Array.from(new Set(input.organizationIds.filter(Boolean)));
  if (!organizationIds.length) {
    return {
      tenants: [],
      source: "unavailable",
      message: "Season launch requires organization-admin scope."
    };
  }

  try {
    const db = dbClient();
    const [
      { data: organizations },
      { data: providerOrganizations },
      { data: seasons },
      { data: teams },
      { data: coachMemberships },
      { data: events },
      { data: imports }
    ] = await withSupabaseTimeout(Promise.all([
      db.from("organizations").select("id,name").in("id", organizationIds).order("name", { ascending: true }),
      db.from("organizations").select("id,provider_sends_enabled").in("id", organizationIds),
      db.from("seasons").select("id,organization_id,name,status,starts_at,ends_at").in("organization_id", organizationIds).order("starts_at", { ascending: false }),
      db.from("teams").select("id,organization_id,season_id,division,name,coach_user_id,mascot,primary_color,secondary_color,theme_key,status").in("organization_id", organizationIds),
      db.from("team_memberships").select("team_id,user_id,role,status").eq("role", "coach").eq("status", "active"),
      db.from("events").select("id,organization_id,season_id,status").in("organization_id", organizationIds),
      db.from("roster_imports")
        .select("id,organization_id,season_id,filename,status,total_rows,warning_rows,error_rows,committed_at,rolled_back_at,commit_manifest_json,created_at")
        .in("organization_id", organizationIds)
        .order("created_at", { ascending: false })
        .limit(40)
    ]), 7000) as [
      { data: Array<{ id: string; name: string }> | null },
      { data: Array<{ id: string; provider_sends_enabled: boolean }> | null },
      { data: Array<{ id: string; organization_id: string; name: string; status: "active" | "archived"; starts_at: string; ends_at: string }> | null },
      { data: Array<{
        id: string;
        organization_id: string;
        season_id: string;
        division: string;
        name: string;
        coach_user_id: string | null;
        mascot: string;
        primary_color: string;
        secondary_color: string;
        theme_key: Team["themeKey"];
        status: "active" | "archived";
      }> | null },
      { data: Array<{ team_id: string; user_id: string; role: "coach"; status: "active" }> | null },
      { data: Array<{
        id: string;
        organization_id: string;
        season_id: string;
        status: "scheduled" | "cancelled" | "completed";
      }> | null },
      { data: Array<{
        id: string;
        organization_id: string;
        season_id: string;
        filename: string | null;
        status: SeasonLaunchImport["status"];
        total_rows: number;
        warning_rows: number;
        error_rows: number;
        committed_at: string | null;
        rolled_back_at: string | null;
        commit_manifest_json: Record<string, unknown> | null;
        created_at: string;
      }> | null }
    ];

    const tenants = (organizations ?? []).flatMap((organization) => {
      const activeSeason = (seasons ?? []).find((season) => (
        season.organization_id === organization.id &&
        season.status === "active"
      ));
      if (!activeSeason) return [];
      const seasonTeams = (teams ?? []).filter((team) => (
        team.organization_id === organization.id &&
        team.season_id === activeSeason.id &&
        team.status !== "archived"
      ));
      const coachTeamIds = new Set((coachMemberships ?? []).map((membership) => membership.team_id));
      return [{
        organizationId: organization.id,
        organizationName: organization.name,
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
        teams: seasonTeams.map((team) => ({
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
        assignedCoachCount: seasonTeams.filter((team) => Boolean(team.coach_user_id) || coachTeamIds.has(team.id)).length,
        scheduledEventCount: (events ?? []).filter((event) => (
          event.organization_id === organization.id &&
          event.season_id === activeSeason.id &&
          event.status === "scheduled"
        )).length,
        providerSendsEnabled: providerOrganizations?.find((item) => item.id === organization.id)?.provider_sends_enabled === true,
        imports: (imports ?? [])
          .filter((item) => item.organization_id === organization.id && item.season_id === activeSeason.id)
          .map((item) => ({
            id: item.id,
            organizationId: item.organization_id,
            seasonId: item.season_id,
            filename: item.filename ?? "roster-import.csv",
            status: item.status,
            totalRows: item.total_rows,
            warningRows: item.warning_rows,
            errorRows: item.error_rows,
            committedAt: item.committed_at ?? undefined,
            rolledBackAt: item.rolled_back_at ?? undefined,
            manifest: item.commit_manifest_json ?? {},
            createdAt: item.created_at
          }))
      }];
    });

    return {
      tenants,
      source: "supabase",
      message: tenants.length
        ? "Season launch context loaded for the signed-in administrator."
        : "No active season is available in the administrator's organization scope."
    };
  } catch {
    return {
      tenants: [],
      source: "unavailable",
      message: "Season launch context could not reach Supabase."
    };
  }
}

async function loadAuthorizedImport(input: {
  rosterImportId: string;
  actorUserId: string;
  action: string;
}) {
  const db = dbClient();
  const { data: rosterImport, error } = await withSupabaseTimeout(db
    .from("roster_imports")
    .select("id,organization_id,season_id,status,committed_at,rolled_back_at")
    .eq("id", input.rosterImportId)
    .maybeSingle(), 7000) as {
      data: {
        id: string;
        organization_id: string;
        season_id: string;
        status: SeasonLaunchImport["status"];
        committed_at: string | null;
        rolled_back_at: string | null;
      } | null;
      error: { message?: string } | null;
    };

  if (error || !rosterImport) {
    return { ok: false as const, message: "Roster import was not found." };
  }
  const access = await requireActiveOrganizationAdmin({
    db,
    organizationId: rosterImport.organization_id,
    userId: input.actorUserId,
    action: input.action
  });
  if (!access.ok) return { ok: false as const, message: access.message };
  return { ok: true as const, db, rosterImport };
}

export async function commitSeasonLaunchRoster(input: {
  rosterImportId: string;
  actorUserId: string;
  confirmWarnings: boolean;
}) {
  if (!input.rosterImportId || !input.actorUserId) {
    return { ok: false, message: "Roster approval requires import and acting administrator." };
  }

  try {
    const authorized = await loadAuthorizedImport({
      rosterImportId: input.rosterImportId,
      actorUserId: input.actorUserId,
      action: "commit season launch roster imports"
    });
    if (!authorized.ok) return authorized;
    const { data, error } = await withSupabaseTimeout(authorized.db.rpc("commit_roster_import", {
      p_roster_import_id: input.rosterImportId,
      p_actor_user_id: input.actorUserId,
      p_confirm_warnings: input.confirmWarnings
    }), 12000) as {
      data: Record<string, unknown> | null;
      error: { message?: string } | null;
    };
    if (error || !data) return { ok: false, message: "Roster approval transaction could not be completed." };
    return data;
  } catch {
    return { ok: false, message: "Roster approval could not reach Supabase." };
  }
}

export async function rollbackSeasonLaunchRoster(input: {
  rosterImportId: string;
  actorUserId: string;
  reason: string;
}) {
  if (!input.rosterImportId || !input.actorUserId || input.reason.trim().length < 10) {
    return { ok: false, message: "Roster rollback requires import, acting administrator, and a 10-character reason." };
  }

  try {
    const authorized = await loadAuthorizedImport({
      rosterImportId: input.rosterImportId,
      actorUserId: input.actorUserId,
      action: "roll back season launch roster imports"
    });
    if (!authorized.ok) return authorized;
    const { data, error } = await withSupabaseTimeout(authorized.db.rpc("rollback_roster_import", {
      p_roster_import_id: input.rosterImportId,
      p_actor_user_id: input.actorUserId,
      p_reason: input.reason.trim()
    }), 12000) as {
      data: Record<string, unknown> | null;
      error: { message?: string } | null;
    };
    if (error || !data) return { ok: false, message: "Roster rollback transaction could not be completed." };
    return data;
  } catch {
    return { ok: false, message: "Roster rollback could not reach Supabase." };
  }
}
