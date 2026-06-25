import { withSupabaseTimeout } from "./timeout";

export type SupabaseAccessClient = {
  // Access helpers span staged tables; keep this boundary narrow until generated
  // Supabase types cover every migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export interface AccessDecision {
  ok: boolean;
  message: string;
}

export interface TeamAccessDecision extends AccessDecision {
  team?: {
    id: string;
    organization_id: string;
    season_id?: string;
    name?: string;
  };
}

export interface OrganizationAccessDecision extends AccessDecision {
  organizationId?: string;
}

export function evaluateTeamStaffAccess(input: {
  hasCoachMembership: boolean;
  hasAdminMembership: boolean;
  action: string;
}): AccessDecision {
  if (input.hasCoachMembership || input.hasAdminMembership) {
    return { ok: true, message: "Access allowed." };
  }

  return {
    ok: false,
    message: `Only assigned coaches or org admins can ${input.action}.`
  };
}

export function evaluateParentPlayerEventAccess(input: {
  eventTeamId?: string | null;
  playerTeamId?: string | null;
  hasGuardianLink: boolean;
}): AccessDecision {
  if (!input.eventTeamId || !input.playerTeamId || input.eventTeamId !== input.playerTeamId) {
    return { ok: false, message: "Parent action requires the player and event to belong to the same team." };
  }

  if (!input.hasGuardianLink) {
    return { ok: false, message: "Parent action requires an active guardian link for this player." };
  }

  return { ok: true, message: "Access allowed." };
}

export async function requireActiveTeamCoachOrOrgAdmin(input: {
  db: SupabaseAccessClient;
  teamId: string;
  userId: string;
  action: string;
}): Promise<TeamAccessDecision> {
  const { data: team, error: teamError } = await withSupabaseTimeout(input.db
    .from("teams")
    .select("id,organization_id,season_id,name")
    .eq("id", input.teamId)
    .single(), 7000) as {
      data: TeamAccessDecision["team"] | null;
      error: { message?: string } | null;
    };

  if (teamError || !team) return { ok: false, message: `${input.action} requires a known team.` };

  const [{ data: coachMemberships }, { data: adminMemberships }] = await withSupabaseTimeout(Promise.all([
    input.db
      .from("team_memberships")
      .select("id")
      .eq("team_id", input.teamId)
      .eq("user_id", input.userId)
      .eq("role", "coach")
      .eq("status", "active"),
    input.db
      .from("organization_memberships")
      .select("id")
      .eq("organization_id", team.organization_id)
      .eq("user_id", input.userId)
      .eq("role", "admin")
      .eq("status", "active")
  ]), 7000) as [
    { data: Array<{ id: string }> | null },
    { data: Array<{ id: string }> | null }
  ];

  const decision = evaluateTeamStaffAccess({
    hasCoachMembership: Boolean(coachMemberships?.length),
    hasAdminMembership: Boolean(adminMemberships?.length),
    action: input.action
  });

  return decision.ok ? { ...decision, team } : decision;
}

export async function requireActiveOrganizationAdmin(input: {
  db: SupabaseAccessClient;
  organizationId: string;
  userId: string;
  action: string;
}): Promise<OrganizationAccessDecision> {
  const { data: adminMemberships } = await withSupabaseTimeout(input.db
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.userId)
    .eq("role", "admin")
    .eq("status", "active"), 7000) as { data: Array<{ id: string }> | null };

  if (adminMemberships?.length) {
    return { ok: true, message: "Access allowed.", organizationId: input.organizationId };
  }

  return {
    ok: false,
    message: `Only active organization admins can ${input.action}.`
  };
}

export async function requireActiveTeamOrganizationAdmin(input: {
  db: SupabaseAccessClient;
  teamId: string;
  userId: string;
  action: string;
}): Promise<OrganizationAccessDecision> {
  const { data: team, error: teamError } = await withSupabaseTimeout(input.db
    .from("teams")
    .select("id,organization_id")
    .eq("id", input.teamId)
    .single(), 7000) as {
      data: { id: string; organization_id: string } | null;
      error: { message?: string } | null;
    };

  if (teamError || !team) return { ok: false, message: `${input.action} requires a known team.` };

  return requireActiveOrganizationAdmin({
    db: input.db,
    organizationId: team.organization_id,
    userId: input.userId,
    action: input.action
  });
}

export async function requireActiveParentForPlayerEvent(input: {
  db: SupabaseAccessClient;
  parentUserId: string;
  playerId: string;
  eventId: string;
}): Promise<AccessDecision> {
  const [{ data: event }, { data: player }, { data: guardians }] = await withSupabaseTimeout(Promise.all([
    input.db
      .from("events")
      .select("id,team_id,organization_id")
      .eq("id", input.eventId)
      .single(),
    input.db
      .from("players")
      .select("id,team_id,organization_id")
      .eq("id", input.playerId)
      .single(),
    input.db
      .from("player_guardians")
      .select("id")
      .eq("player_id", input.playerId)
      .eq("parent_user_id", input.parentUserId)
      .eq("status", "active")
  ]), 7000) as [
    { data: { id: string; team_id: string; organization_id: string } | null },
    { data: { id: string; team_id: string; organization_id: string } | null },
    { data: Array<{ id: string }> | null }
  ];

  return evaluateParentPlayerEventAccess({
    eventTeamId: event?.team_id,
    playerTeamId: player?.team_id,
    hasGuardianLink: Boolean(guardians?.length)
  });
}
