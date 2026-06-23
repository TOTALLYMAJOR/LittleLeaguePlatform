import { seedState, type RegistrationRequest } from "@/lib/domain";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

export interface PublicRegistrationInput {
  teamId: string;
  parentName: string;
  parentEmail: string;
  playerFirstName: string;
  playerLastInitial: string;
}

export interface RegistrationTeamOption {
  id: string;
  name: string;
  division: string;
}

export interface RegistrationServiceResult {
  ok: boolean;
  message: string;
  request?: RegistrationRequest;
}

function normalizeRegistrationInput(input: PublicRegistrationInput) {
  return {
    teamId: input.teamId.trim(),
    parentName: input.parentName.trim(),
    parentEmail: input.parentEmail.trim().toLowerCase(),
    playerFirstName: input.playerFirstName.trim(),
    playerLastInitial: input.playerLastInitial.trim().slice(0, 1).toUpperCase()
  };
}

function validateRegistrationInput(input: ReturnType<typeof normalizeRegistrationInput>) {
  if (!input.teamId) return "Registration requires a team.";
  if (!input.parentName || !input.playerFirstName || !input.playerLastInitial) {
    return "Parent name, player first name, and player last initial are required.";
  }
  if (!input.parentEmail.includes("@")) return "Enter a valid parent email.";
  return null;
}

function mapRegistrationRow(row: {
  id: string;
  organization_id: string;
  season_id: string;
  team_id: string;
  parent_name: string;
  parent_email: string;
  player_first_name: string;
  player_last_initial: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by_user_id: string | null;
}): RegistrationRequest {
  return {
    id: row.id,
    organizationId: row.organization_id,
    seasonId: row.season_id,
    teamId: row.team_id,
    parentName: row.parent_name,
    parentEmail: row.parent_email,
    playerFirstName: row.player_first_name,
    playerLastInitial: row.player_last_initial,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewedByUserId: row.reviewed_by_user_id ?? undefined
  };
}

function fallbackTeamOptions(): RegistrationTeamOption[] {
  return seedState.teams.map((team) => ({
    id: team.id,
    name: team.name,
    division: team.division
  }));
}

export async function listRegistrationTeamOptions(): Promise<RegistrationTeamOption[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await withSupabaseTimeout(supabase
      .from("teams")
      .select("id,name,division")
      .order("division", { ascending: true })
      .order("name", { ascending: true }));

    if (error || !data?.length) return fallbackTeamOptions();
    return data.map((team) => ({
      id: team.id,
      name: team.name,
      division: team.division
    }));
  } catch {
    return fallbackTeamOptions();
  }
}

export async function listRegistrationRequests(): Promise<RegistrationRequest[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await withSupabaseTimeout(supabase
      .from("registration_requests")
      .select("id,organization_id,season_id,team_id,parent_name,parent_email,player_first_name,player_last_initial,status,created_at,reviewed_at,reviewed_by_user_id")
      .order("created_at", { ascending: false }));

    if (error || !data) return seedState.registrationRequests;
    return data.map(mapRegistrationRow);
  } catch {
    return seedState.registrationRequests;
  }
}

export async function createPendingRegistration(input: PublicRegistrationInput): Promise<RegistrationServiceResult> {
  const normalized = normalizeRegistrationInput(input);
  const validationMessage = validateRegistrationInput(normalized);
  if (validationMessage) return { ok: false, message: validationMessage };

  try {
    const supabase = createSupabaseAdminClient();
    const { data: team, error: teamError } = await withSupabaseTimeout(supabase
      .from("teams")
      .select("id,organization_id,season_id")
      .eq("id", normalized.teamId)
      .single(), 7000);

    if (teamError || !team) {
      return { ok: false, message: "Registration requires a known team." };
    }

    const { data, error } = await withSupabaseTimeout(supabase
      .from("registration_requests")
      .insert({
        organization_id: team.organization_id,
        season_id: team.season_id,
        team_id: team.id,
        parent_name: normalized.parentName,
        parent_email: normalized.parentEmail,
        player_first_name: normalized.playerFirstName,
        player_last_initial: normalized.playerLastInitial,
        status: "pending"
      })
      .select("id,organization_id,season_id,team_id,parent_name,parent_email,player_first_name,player_last_initial,status,created_at,reviewed_at,reviewed_by_user_id")
      .single(), 7000);

    if (error || !data) {
      return { ok: false, message: "Registration could not be saved. Please try again." };
    }

    return {
      ok: true,
      message: "Registration request saved for admin review. No account access was granted.",
      request: mapRegistrationRow(data)
    };
  } catch {
    return { ok: false, message: "Registration could not reach the server. Please try again." };
  }
}

export function mergeRegistrationRequests(localRequests: RegistrationRequest[], serverRequests: RegistrationRequest[]) {
  const seen = new Set<string>();
  return [...serverRequests, ...localRequests].filter((request) => {
    if (seen.has(request.id)) return false;
    seen.add(request.id);
    return true;
  });
}
