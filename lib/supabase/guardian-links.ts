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

function fallbackGuardianLinkRepairData(organizationId: string): GuardianLinkRepairData {
  const includeSeed = organizationId === seedState.organization.id;
  const activeGuardianPlayerIds = new Set(seedState.guardianLinks.filter((link) => link.status === "active" && link.parentUserId).map((link) => link.playerId));
  return {
    organizationId,
    missingLinks: (includeSeed ? seedState.players : [])
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
    parentOptions: (includeSeed ? seedState.users : [])
      .filter((user) => user.role === "parent")
      .map((user) => ({ userId: user.id, name: user.name, email: user.email })),
    message: "Showing local missing-link records until Supabase guardian rows are available."
  };
}

export async function listGuardianLinkRepairData(input: {
  organizationId: string;
}): Promise<GuardianLinkRepairData> {
  const organizationId = input.organizationId.trim();
  if (!organizationId) return fallbackGuardianLinkRepairData("");

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const [{ data: organizations }, { data: players }, { data: teams }] = await withSupabaseTimeout(Promise.all([
      db.from("organizations").select("id,name").eq("id", organizationId).limit(1),
      db.from("players").select("id,organization_id,team_id,first_name,last_initial").eq("organization_id", organizationId).order("first_name", { ascending: true }),
      db.from("teams").select("id,organization_id,name").eq("organization_id", organizationId)
    ]), 7000) as [
      { data: Array<{ id: string; name: string }> | null },
      { data: Array<{ id: string; organization_id: string; team_id: string; first_name: string; last_initial: string }> | null },
      { data: Array<{ id: string; organization_id: string; name: string }> | null }
    ];

    const organization = organizations?.[0];
    if (!organization || !players || !teams) return fallbackGuardianLinkRepairData(organizationId);
    const playerIds = players.map((player) => player.id);
    const teamIds = teams.map((team) => team.id);
    const [{ data: guardianLinks }, { data: parentMemberships }] = await withSupabaseTimeout(Promise.all([
      playerIds.length
        ? db.from("player_guardians").select("player_id,parent_user_id,status").in("player_id", playerIds).eq("status", "active")
        : Promise.resolve({ data: [] }),
      teamIds.length
        ? db.from("team_memberships").select("team_id,user_id,role,status").in("team_id", teamIds).eq("role", "parent").eq("status", "active")
        : Promise.resolve({ data: [] })
    ]), 7000) as [
      { data: Array<{ player_id: string; parent_user_id: string | null; status: string }> | null },
      { data: Array<{ team_id: string; user_id: string; role: string; status: string }> | null }
    ];
    const parentUserIds = [...new Set([
      ...(guardianLinks ?? []).flatMap((link) => link.parent_user_id ? [link.parent_user_id] : []),
      ...(parentMemberships ?? []).map((membership) => membership.user_id)
    ])];
    const { data: profiles } = parentUserIds.length
      ? await withSupabaseTimeout(db.from("profiles").select("id,display_name,email,default_role").in("id", parentUserIds).eq("default_role", "parent"), 7000) as {
        data: Array<{ id: string; display_name: string; email: string; default_role: string }> | null;
      }
      : { data: [] };
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
    return fallbackGuardianLinkRepairData(organizationId);
  }
}

export async function repairGuardianLink(input: {
  organizationId: string;
  actorUserId: string;
  playerId: string;
  parentUserId: string;
  relationship: "mother" | "father" | "guardian" | "other";
  verificationNote: string;
}) {
  const verificationNote = String(input.verificationNote ?? "").trim();
  if (!input.organizationId || !input.actorUserId || !input.playerId || !input.parentUserId || verificationNote.length < 10 || verificationNote.length > 500) {
    return { ok: false, message: "Guardian repair requires organization, admin, player, parent, and a 10-500 character verification note." };
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

    const { data: parentProfile } = await withSupabaseTimeout(db
      .from("profiles")
      .select("id,default_role")
      .eq("id", input.parentUserId)
      .single(), 7000) as { data: { id: string; default_role: string } | null };
    if (!parentProfile || parentProfile.default_role !== "parent") {
      return { ok: false, message: "Guardian repair requires an existing parent profile." };
    }

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
      summary: `Guardian link repaired for player ${input.playerId}; parent team access is active. Verification note: ${verificationNote}`
    }), 7000);

    return { ok: true, message: "Guardian link repaired and parent team access activated.", guardianLink };
  } catch {
    return { ok: false, message: "Guardian repair could not reach Supabase." };
  }
}
