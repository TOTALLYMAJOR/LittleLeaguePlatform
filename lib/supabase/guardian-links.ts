import { seedState } from "@/lib/domain";
import { requireActiveOrganizationAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Guardian repair spans staged profile, roster, guardian, membership, and
  // audit tables.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export interface GuardianLinkRepairData {
  organizationId: string;
  missingLinks: Array<{
    playerId: string;
    playerName: string;
    teamId: string;
    teamName: string;
  }>;
  parentOptions: Array<{
    userId: string;
    name: string;
    email: string;
  }>;
  message: string;
}

function fallbackGuardianLinkRepairData(): GuardianLinkRepairData {
  const activeGuardianPlayerIds = new Set(seedState.guardianLinks.filter((link) => link.status === "active" && link.parentUserId).map((link) => link.playerId));
  return {
    organizationId: seedState.organization.id,
    missingLinks: seedState.players
      .filter((player) => !activeGuardianPlayerIds.has(player.id))
      .map((player) => {
        const team = seedState.teams.find((item) => item.id === player.teamId);
        return {
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastInitial}.`,
          teamId: player.teamId,
          teamName: team?.name ?? "Unknown team"
        };
      }),
    parentOptions: seedState.users
      .filter((user) => user.role === "parent")
      .map((user) => ({ userId: user.id, name: user.name, email: user.email })),
    message: "Showing local missing-link records until Supabase guardian rows are available."
  };
}

export async function listGuardianLinkRepairData(): Promise<GuardianLinkRepairData> {
  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const [
      { data: organizations },
      { data: players },
      { data: guardianLinks },
      { data: teams },
      { data: profiles }
    ] = await withSupabaseTimeout(Promise.all([
      db.from("organizations").select("id,name").limit(1),
      db.from("players").select("id,organization_id,team_id,first_name,last_initial").order("first_name", { ascending: true }),
      db.from("player_guardians").select("player_id,parent_user_id,status").eq("status", "active"),
      db.from("teams").select("id,name"),
      db.from("profiles").select("id,display_name,email,default_role").eq("default_role", "parent")
    ]), 7000) as [
      { data: Array<{ id: string; name: string }> | null },
      { data: Array<{ id: string; organization_id: string; team_id: string; first_name: string; last_initial: string }> | null },
      { data: Array<{ player_id: string; parent_user_id: string | null; status: string }> | null },
      { data: Array<{ id: string; name: string }> | null },
      { data: Array<{ id: string; display_name: string; email: string; default_role: string }> | null }
    ];

    const organization = organizations?.[0];
    if (!organization || !players || !teams) return fallbackGuardianLinkRepairData();
    const teamById = new Map(teams.map((team) => [team.id, team]));
    const activeGuardianPlayerIds = new Set((guardianLinks ?? []).filter((link) => link.parent_user_id).map((link) => link.player_id));

    return {
      organizationId: organization.id,
      missingLinks: players
        .filter((player) => player.organization_id === organization.id && !activeGuardianPlayerIds.has(player.id))
        .map((player) => ({
          playerId: player.id,
          playerName: `${player.first_name} ${player.last_initial}.`,
          teamId: player.team_id,
          teamName: teamById.get(player.team_id)?.name ?? "Unknown team"
        })),
      parentOptions: (profiles ?? []).map((profile) => ({
        userId: profile.id,
        name: profile.display_name,
        email: profile.email
      })),
      message: "Showing Supabase missing guardian-link records."
    };
  } catch {
    return fallbackGuardianLinkRepairData();
  }
}

export async function repairGuardianLink(input: {
  organizationId: string;
  actorUserId: string;
  playerId: string;
  parentUserId: string;
  relationship: "mother" | "father" | "guardian" | "other";
}) {
  if (!input.organizationId || !input.actorUserId || !input.playerId || !input.parentUserId) {
    return { ok: false, message: "Guardian repair requires organization, admin, player, and parent." };
  }

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const access = await requireActiveOrganizationAdmin({
      db,
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "repair guardian links"
    });
    if (!access.ok) return { ok: false, message: access.message };

    const { data: player } = await withSupabaseTimeout(db
      .from("players")
      .select("id,team_id,organization_id")
      .eq("id", input.playerId)
      .eq("organization_id", input.organizationId)
      .single(), 7000) as { data: { id: string; team_id: string; organization_id: string } | null };
    if (!player) return { ok: false, message: "Player must belong to this organization." };

    const { data: guardianLink, error } = await withSupabaseTimeout(db
      .from("player_guardians")
      .upsert({
        player_id: input.playerId,
        parent_user_id: input.parentUserId,
        relationship: input.relationship,
        status: "active"
      }, { onConflict: "player_id,parent_user_id" })
      .select("id,player_id,parent_user_id,status")
      .single(), 7000) as {
        data: { id: string; player_id: string; parent_user_id: string; status: string } | null;
        error: { message?: string } | null;
      };
    if (error || !guardianLink) return { ok: false, message: "Guardian link could not be repaired." };

    await withSupabaseTimeout(db.from("team_memberships").upsert({
      team_id: player.team_id,
      user_id: input.parentUserId,
      role: "parent",
      status: "active"
    }, { onConflict: "team_id,user_id,role" }), 7000);

    await withSupabaseTimeout(db.from("audit_events").insert({
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId,
      action: "guardian_link_repaired",
      target_type: "player_guardian",
      target_id: guardianLink.id,
      summary: `Guardian link repaired for player ${input.playerId}; parent team access is active.`
    }), 7000);

    return { ok: true, message: "Guardian link repaired and parent team access activated.", guardianLink };
  } catch {
    return { ok: false, message: "Guardian repair could not reach Supabase." };
  }
}
