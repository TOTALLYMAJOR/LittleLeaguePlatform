import { seedState, type ProgramThemeKey, type Team, type TeamMembership, type User } from "@/lib/domain";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

const hexColorPattern = /^#[0-9a-fA-F]{6}$/;
const themeKeys = new Set<ProgramThemeKey>([
  "soccer",
  "football",
  "baseball",
  "scouts",
  "golf",
  "tennis",
  "swim",
  "generic"
]);

export interface TeamThemeAudit {
  id: string;
  actorUserId?: string;
  teamId: string;
  summary: string;
  createdAt: string;
}

export interface AdminThemeData {
  teams: Team[];
  users: User[];
  teamMemberships: TeamMembership[];
  audits: TeamThemeAudit[];
}

export interface UpdateTeamBrandingInput {
  teamId: string;
  actorUserId: string;
  mascot: string;
  primaryColor: string;
  secondaryColor: string;
  themeKey: ProgramThemeKey;
}

export interface UpdateTeamBrandingResult {
  ok: boolean;
  message: string;
  team?: Team;
  audit?: TeamThemeAudit;
}

function mapTeam(row: {
  id: string;
  organization_id: string;
  season_id: string;
  division: string;
  name: string;
  coach_user_id: string | null;
  mascot: string;
  primary_color: string;
  secondary_color: string;
  theme_key: ProgramThemeKey;
}): Team {
  return {
    id: row.id,
    organizationId: row.organization_id,
    seasonId: row.season_id,
    division: row.division,
    name: row.name,
    coachUserId: row.coach_user_id ?? undefined,
    mascot: row.mascot,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    themeKey: row.theme_key
  };
}

function fallbackThemeData(): AdminThemeData {
  return {
    teams: seedState.teams,
    users: seedState.users,
    teamMemberships: seedState.teamMemberships,
    audits: seedState.auditEvents
      .filter((event) => event.action === "team_portal_branding_updated")
      .map((event) => ({
        id: event.id,
        actorUserId: event.actorUserId,
        teamId: event.targetId,
        summary: event.summary,
        createdAt: event.createdAt
      }))
  };
}

function validateInput(input: UpdateTeamBrandingInput) {
  const mascot = input.mascot.trim();
  if (!input.teamId || !input.actorUserId) return "Team and acting user are required.";
  if (mascot.length < 2 || mascot.length > 40) return "Mascot must be 2-40 characters.";
  if (!hexColorPattern.test(input.primaryColor) || !hexColorPattern.test(input.secondaryColor)) {
    return "Team colors must use #RRGGBB hex values.";
  }
  if (!themeKeys.has(input.themeKey)) return "Program theme is not supported.";
  return null;
}

export async function listAdminThemeData(): Promise<AdminThemeData> {
  try {
    const supabase = createSupabaseAdminClient();
    const [teamsResult, profilesResult, membershipsResult, auditsResult] = await withSupabaseTimeout(Promise.all([
      supabase
        .from("teams")
        .select("id,organization_id,season_id,division,name,coach_user_id,mascot,primary_color,secondary_color,theme_key")
        .order("division", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("profiles")
        .select("id,display_name,email,phone,default_role")
        .order("display_name", { ascending: true }),
      supabase
        .from("team_memberships")
        .select("id,team_id,user_id,role,status")
        .order("created_at", { ascending: false }),
      supabase
        .from("audit_events")
        .select("id,actor_user_id,target_id,summary,created_at")
        .eq("action", "team_portal_branding_updated")
        .eq("target_type", "team")
        .order("created_at", { ascending: false })
        .limit(25)
    ]), 7000);

    if (teamsResult.error || profilesResult.error || membershipsResult.error || auditsResult.error || !teamsResult.data?.length) {
      return fallbackThemeData();
    }

    return {
      teams: teamsResult.data.map(mapTeam),
      users: (profilesResult.data ?? []).map((profile) => ({
        id: profile.id,
        role: profile.default_role,
        name: profile.display_name,
        email: profile.email,
        phone: profile.phone ?? undefined
      })),
      teamMemberships: (membershipsResult.data ?? []).map((membership) => ({
        id: membership.id,
        teamId: membership.team_id,
        userId: membership.user_id,
        role: membership.role,
        status: membership.status
      })),
      audits: (auditsResult.data ?? []).map((audit) => ({
        id: audit.id,
        actorUserId: audit.actor_user_id ?? undefined,
        teamId: audit.target_id,
        summary: audit.summary,
        createdAt: audit.created_at
      }))
    };
  } catch {
    return fallbackThemeData();
  }
}

export async function updateTeamBranding(input: UpdateTeamBrandingInput): Promise<UpdateTeamBrandingResult> {
  const validationMessage = validateInput(input);
  if (validationMessage) return { ok: false, message: validationMessage };

  try {
    const supabase = createSupabaseAdminClient();
    const { data: team, error: teamError } = await withSupabaseTimeout(supabase
      .from("teams")
      .select("id,organization_id,season_id,division,name,coach_user_id,mascot,primary_color,secondary_color,theme_key")
      .eq("id", input.teamId)
      .single(), 7000);

    if (teamError || !team) return { ok: false, message: "Team portal branding requires a known team." };

    const [{ data: actor }, { data: orgMemberships }, { data: teamMemberships }] = await withSupabaseTimeout(Promise.all([
      supabase.from("profiles").select("id,display_name,email,phone,default_role").eq("id", input.actorUserId).single(),
      supabase
        .from("organization_memberships")
        .select("id")
        .eq("organization_id", team.organization_id)
        .eq("user_id", input.actorUserId)
        .eq("role", "admin")
        .eq("status", "active"),
      supabase
        .from("team_memberships")
        .select("id")
        .eq("team_id", team.id)
        .eq("user_id", input.actorUserId)
        .eq("role", "coach")
        .eq("status", "active")
    ]), 7000);

    if (!actor) return { ok: false, message: "Acting user is not a Supabase profile." };

    const canUpdate = Boolean(orgMemberships?.length || teamMemberships?.length);
    if (!canUpdate) {
      return { ok: false, message: "Only org admins or the assigned coach can update this team portal." };
    }

    const { data: updatedTeam, error: updateError } = await withSupabaseTimeout(supabase
      .from("teams")
      .update({
        mascot: input.mascot.trim(),
        primary_color: input.primaryColor,
        secondary_color: input.secondaryColor,
        theme_key: input.themeKey
      })
      .eq("id", team.id)
      .select("id,organization_id,season_id,division,name,coach_user_id,mascot,primary_color,secondary_color,theme_key")
      .single(), 7000);

    if (updateError || !updatedTeam) {
      return { ok: false, message: "Team portal branding could not be saved." };
    }

    const summary = `${updatedTeam.name} portal colors, mascot, and theme updated.`;
    const { data: audit } = await supabase
      .from("audit_events")
      .insert({
        organization_id: updatedTeam.organization_id,
        actor_user_id: actor.id,
        action: "team_portal_branding_updated",
        target_type: "team",
        target_id: updatedTeam.id,
        summary
      })
      .select("id,actor_user_id,target_id,summary,created_at")
      .single();

    return {
      ok: true,
      message: `${updatedTeam.name} portal branding saved to Supabase.`,
      team: mapTeam(updatedTeam),
      audit: audit ? {
        id: audit.id,
        actorUserId: audit.actor_user_id ?? undefined,
        teamId: audit.target_id,
        summary: audit.summary,
        createdAt: audit.created_at
      } : undefined
    };
  } catch {
    return { ok: false, message: "Team portal branding could not reach Supabase." };
  }
}
