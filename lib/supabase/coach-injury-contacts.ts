import { requireActiveTeamCoachOrOrgAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Safety contacts span staged guardian and emergency-contact tables.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export interface CoachInjuryContact {
  id: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  contactName: string;
  phone: string;
  relationship: string;
  kind: "guardian" | "emergency_contact";
  priority: number;
  medicalDecisionStatus: "approved" | "denied" | "not_recorded";
}

type PlayerRow = {
  id: string;
  team_id: string;
  first_name: string;
  last_initial: string;
};

type TeamRow = {
  id: string;
  name: string;
};

type GuardianRow = {
  id: string;
  player_id: string;
  parent_user_id: string | null;
  relationship: string;
  status: string;
};

type ProfileRow = {
  id: string;
  display_name: string;
  phone: string | null;
};

type AuthorizationRow = {
  player_guardian_id: string;
  authorization_type: "medical_decision";
  allowed: boolean;
  effective_at: string;
  expires_at: string | null;
};

type EmergencyContactRow = {
  id: string;
  player_id: string;
  name: string;
  phone: string;
  relationship: string;
  priority: number;
};

function isCurrentAuthorization(row: AuthorizationRow, now: number) {
  const startsAt = Date.parse(row.effective_at);
  const expiresAt = row.expires_at ? Date.parse(row.expires_at) : Number.POSITIVE_INFINITY;
  return startsAt <= now && expiresAt > now;
}

export function normalizeDialablePhone(phone: string | null | undefined) {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}

export function buildCoachInjuryContacts(input: {
  teamIds: string[];
  teams: TeamRow[];
  players: PlayerRow[];
  guardians: GuardianRow[];
  profiles: ProfileRow[];
  authorizations: AuthorizationRow[];
  emergencyContacts: EmergencyContactRow[];
  now?: number;
}): CoachInjuryContact[] {
  const now = input.now ?? Date.now();
  const teamIds = new Set(input.teamIds);
  const players = input.players.filter((player) => teamIds.has(player.team_id));
  const playerIds = new Set(players.map((player) => player.id));
  const playerById = new Map(players.map((player) => [player.id, player]));
  const teamById = new Map(input.teams.filter((team) => teamIds.has(team.id)).map((team) => [team.id, team]));
  const profileById = new Map(input.profiles.map((profile) => [profile.id, profile]));

  const guardianContacts = input.guardians.flatMap((guardian): CoachInjuryContact[] => {
    if (guardian.status !== "active" || !guardian.parent_user_id || !playerIds.has(guardian.player_id)) return [];
    const player = playerById.get(guardian.player_id);
    const profile = profileById.get(guardian.parent_user_id);
    const phone = normalizeDialablePhone(profile?.phone);
    if (!player || !profile || !phone) return [];
    const currentAuthorization = input.authorizations.find((authorization) => (
      authorization.player_guardian_id === guardian.id &&
      authorization.authorization_type === "medical_decision" &&
      isCurrentAuthorization(authorization, now)
    ));
    return [{
      id: `guardian:${guardian.id}`,
      playerId: player.id,
      playerName: `${player.first_name} ${player.last_initial}.`,
      teamId: player.team_id,
      teamName: teamById.get(player.team_id)?.name ?? "Team",
      contactName: profile.display_name,
      phone,
      relationship: guardian.relationship,
      kind: "guardian",
      priority: currentAuthorization?.allowed ? 0 : 1,
      medicalDecisionStatus: currentAuthorization
        ? currentAuthorization.allowed ? "approved" : "denied"
        : "not_recorded"
    }];
  });

  const emergencyContacts = input.emergencyContacts.flatMap((contact): CoachInjuryContact[] => {
    const player = playerById.get(contact.player_id);
    const phone = normalizeDialablePhone(contact.phone);
    if (!player || !phone) return [];
    return [{
      id: `emergency:${contact.id}`,
      playerId: player.id,
      playerName: `${player.first_name} ${player.last_initial}.`,
      teamId: player.team_id,
      teamName: teamById.get(player.team_id)?.name ?? "Team",
      contactName: contact.name,
      phone,
      relationship: contact.relationship,
      kind: "emergency_contact",
      priority: Math.max(1, contact.priority),
      medicalDecisionStatus: "not_recorded"
    }];
  });

  return [...guardianContacts, ...emergencyContacts].sort((left, right) => (
    left.playerName.localeCompare(right.playerName) ||
    left.priority - right.priority ||
    left.contactName.localeCompare(right.contactName)
  ));
}

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

export async function listCoachInjuryContacts(input: {
  actorUserId: string;
  teamIds: string[];
}) {
  const teamIds = Array.from(new Set(input.teamIds.filter(Boolean)));
  if (!input.actorUserId || !teamIds.length) {
    return { ok: false, message: "Injury contacts require a signed-in coach with an assigned team.", contacts: [] as CoachInjuryContact[] };
  }

  try {
    const db = dbClient();
    const access = await Promise.all(teamIds.map((teamId) => requireActiveTeamCoachOrOrgAdmin({
      db,
      teamId,
      userId: input.actorUserId,
      action: "read injury contact details"
    })));
    if (access.some((decision) => !decision.ok)) {
      return { ok: false, message: "Injury contacts are limited to assigned coach teams.", contacts: [] as CoachInjuryContact[] };
    }

    const [{ data: teams, error: teamsError }, { data: players, error: playersError }] = await withSupabaseTimeout(Promise.all([
      db.from("teams").select("id,name").in("id", teamIds),
      db.from("players").select("id,team_id,first_name,last_initial").in("team_id", teamIds).order("first_name", { ascending: true })
    ]), 7000) as [
      { data: TeamRow[] | null; error: { message?: string } | null },
      { data: PlayerRow[] | null; error: { message?: string } | null }
    ];
    if (teamsError || playersError) {
      return { ok: false, message: "Coach injury contacts are unavailable.", contacts: [] as CoachInjuryContact[] };
    }
    const playerIds = (players ?? []).map((player) => player.id);
    if (!playerIds.length) {
      return { ok: true, message: "No rostered players are available for injury contacts.", contacts: [] as CoachInjuryContact[] };
    }

    const [{ data: guardians, error: guardiansError }, { data: emergencyContacts, error: emergencyError }] = await withSupabaseTimeout(Promise.all([
      db.from("player_guardians").select("id,player_id,parent_user_id,relationship,status").in("player_id", playerIds).eq("status", "active"),
      db.from("emergency_contacts").select("id,player_id,name,phone,relationship,priority").in("player_id", playerIds).order("priority", { ascending: true })
    ]), 7000) as [
      { data: GuardianRow[] | null; error: { message?: string } | null },
      { data: EmergencyContactRow[] | null; error: { message?: string } | null }
    ];
    if (guardiansError || emergencyError) {
      return { ok: false, message: "Guardian or emergency contact records are unavailable.", contacts: [] as CoachInjuryContact[] };
    }
    const parentUserIds = Array.from(new Set((guardians ?? []).flatMap((guardian) => guardian.parent_user_id ? [guardian.parent_user_id] : [])));
    const guardianIds = (guardians ?? []).map((guardian) => guardian.id);
    const [profilesResult, authorizationsResult] = await withSupabaseTimeout(Promise.all([
      parentUserIds.length
        ? db.from("profiles").select("id,display_name,phone").in("id", parentUserIds)
        : Promise.resolve({ data: [], error: null }),
      guardianIds.length
        ? db.from("guardian_authorizations").select("player_guardian_id,authorization_type,allowed,effective_at,expires_at").in("player_guardian_id", guardianIds).eq("authorization_type", "medical_decision")
        : Promise.resolve({ data: [], error: null })
    ]), 7000) as [
      { data: ProfileRow[] | null; error: { message?: string } | null },
      { data: AuthorizationRow[] | null; error: { message?: string } | null }
    ];
    if (profilesResult.error || authorizationsResult.error) {
      return { ok: false, message: "Guardian call details or medical-decision evidence are unavailable.", contacts: [] as CoachInjuryContact[] };
    }

    const contacts = buildCoachInjuryContacts({
      teamIds,
      teams: teams ?? [],
      players: players ?? [],
      guardians: guardians ?? [],
      profiles: profilesResult.data ?? [],
      authorizations: authorizationsResult.data ?? [],
      emergencyContacts: emergencyContacts ?? []
    });
    return {
      ok: true,
      message: contacts.length
        ? "Injury contacts loaded for the signed-in coach's assigned teams."
        : "No callable guardian or emergency contacts are recorded for this coach scope.",
      contacts
    };
  } catch {
    return { ok: false, message: "Coach injury contacts could not reach team safety records.", contacts: [] as CoachInjuryContact[] };
  }
}
