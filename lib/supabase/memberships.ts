import { seedState } from "@/lib/domain";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

export interface AdminProfileOption {
  id: string;
  displayName: string;
  email: string;
  defaultRole: "admin" | "coach" | "parent";
}

export interface AdminTeamOption {
  id: string;
  name: string;
  division: string;
}

export interface AdminTeamMembership {
  id: string;
  teamId: string;
  userId: string;
  role: "coach" | "parent";
  status: "active" | "invited" | "removed";
}

export interface AdminMembershipData {
  profiles: AdminProfileOption[];
  teams: AdminTeamOption[];
  memberships: AdminTeamMembership[];
}

export interface CreateTeamMembershipInput {
  teamId: string;
  userId: string;
  role: "coach" | "parent";
}

export interface CreateTeamMembershipResult {
  ok: boolean;
  message: string;
  membership?: AdminTeamMembership;
}

function fallbackTeams(): AdminTeamOption[] {
  return seedState.teams.map((team) => ({
    id: team.id,
    name: team.name,
    division: team.division
  }));
}

export async function listAdminMembershipData(): Promise<AdminMembershipData> {
  try {
    const supabase = createSupabaseAdminClient();
    const [profilesResult, teamsResult, membershipsResult] = await withSupabaseTimeout(Promise.all([
      supabase
        .from("profiles")
        .select("id,display_name,email,default_role")
        .order("display_name", { ascending: true }),
      supabase
        .from("teams")
        .select("id,name,division")
        .order("division", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("team_memberships")
        .select("id,team_id,user_id,role,status")
        .order("created_at", { ascending: false })
    ]));

    return {
      profiles: profilesResult.data?.map((profile) => ({
        id: profile.id,
        displayName: profile.display_name,
        email: profile.email,
        defaultRole: profile.default_role
      })) ?? [],
      teams: teamsResult.data?.map((team) => ({
        id: team.id,
        name: team.name,
        division: team.division
      })) ?? fallbackTeams(),
      memberships: membershipsResult.data?.map((membership) => ({
        id: membership.id,
        teamId: membership.team_id,
        userId: membership.user_id,
        role: membership.role,
        status: membership.status
      })) ?? []
    };
  } catch {
    return { profiles: [], teams: fallbackTeams(), memberships: [] };
  }
}

export async function createTeamMembership(input: CreateTeamMembershipInput): Promise<CreateTeamMembershipResult> {
  const teamId = input.teamId.trim();
  const userId = input.userId.trim();
  if (!teamId || !userId) return { ok: false, message: "Team and user are required." };

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await withSupabaseTimeout(supabase
      .from("team_memberships")
      .upsert({
        team_id: teamId,
        user_id: userId,
        role: input.role,
        status: "active"
      }, {
        onConflict: "team_id,user_id,role"
      })
      .select("id,team_id,user_id,role,status")
      .single(), 7000);

    if (error || !data) {
      return { ok: false, message: "Team membership could not be saved." };
    }

    if (input.role === "coach") {
      await supabase.from("teams").update({ coach_user_id: userId }).eq("id", teamId);
    }

    return {
      ok: true,
      message: "Team membership saved. Access is now controlled by Supabase RLS.",
      membership: {
        id: data.id,
        teamId: data.team_id,
        userId: data.user_id,
        role: data.role,
        status: data.status
      }
    };
  } catch {
    return { ok: false, message: "Team membership could not reach the server." };
  }
}
