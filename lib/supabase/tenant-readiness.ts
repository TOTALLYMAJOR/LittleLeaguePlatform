import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Tenant readiness spans staged admin tables; keep the query boundary dynamic
  // until generated database types cover every migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export type TenantReadinessCheckStatus = "ready" | "needs_attention" | "blocked";
export type TenantInviteReadiness = "ready_to_invite" | "needs_setup" | "blocked";

export interface TenantReadinessCheck {
  id: string;
  label: string;
  status: TenantReadinessCheckStatus;
  detail: string;
  actionHref: string;
  actionLabel: string;
  sourceOfTruth: string;
  responsibleAuthority: string;
  privacyBoundary: string;
  explanation: string;
}

export interface TenantReadinessSummary {
  organizationId: string;
  organizationName: string;
  activeSeasonId?: string;
  activeSeasonName?: string;
  readiness: TenantInviteReadiness;
  readyToInviteFamilies: boolean;
  blockingCount: number;
  attentionCount: number;
  activeTeamCount: number;
  rosteredPlayerCount: number;
  activeCoachTeamCount: number;
  activeGuardianLinkCount: number;
  pendingRegistrationCount: number;
  scheduledEventCount: number;
  checks: TenantReadinessCheck[];
}

export interface TenantReadinessData {
  tenants: TenantReadinessSummary[];
  message: string;
  source: "supabase" | "unavailable";
}

interface OrganizationRow {
  id: string;
  name: string;
}

interface SeasonRow {
  id: string;
  organization_id: string;
  name: string;
  status: "active" | "archived";
  starts_at?: string | null;
  ends_at?: string | null;
}

interface TeamRow {
  id: string;
  organization_id: string;
  season_id: string;
  name: string;
  division?: string | null;
  status?: "active" | "archived" | null;
  coach_user_id?: string | null;
}

interface PlayerRow {
  id: string;
  organization_id: string;
  team_id: string;
  season_id: string;
  roster_status?: "active" | "inactive" | "archived" | null;
}

interface TeamMembershipRow {
  team_id: string;
  user_id: string;
  role: "coach" | "parent";
  status: "active" | "invited" | "removed";
}

interface GuardianLinkRow {
  player_id: string;
  parent_user_id: string;
  status: "active" | "invited" | "removed";
}

interface RegistrationRequestRow {
  id: string;
  organization_id: string;
  status: "pending" | "approved" | "rejected";
}

interface EventRow {
  id: string;
  organization_id: string;
  team_id: string;
  season_id: string;
  status: "scheduled" | "cancelled" | "completed";
}

export interface BuildTenantReadinessInput {
  organizations: OrganizationRow[];
  seasons: SeasonRow[];
  teams: TeamRow[];
  players: PlayerRow[];
  teamMemberships: TeamMembershipRow[];
  guardianLinks: GuardianLinkRow[];
  registrationRequests: RegistrationRequestRow[];
  events: EventRow[];
}

function byNewestSeason(left: SeasonRow, right: SeasonRow) {
  return new Date(right.starts_at ?? "").getTime() - new Date(left.starts_at ?? "").getTime();
}

function check(
  input: Omit<TenantReadinessCheck, "sourceOfTruth" | "responsibleAuthority" | "privacyBoundary" | "explanation">
): TenantReadinessCheck {
  return {
    ...input,
    sourceOfTruth: "Organization-scoped season, team, roster, membership, and event records.",
    responsibleAuthority: "League administrator.",
    privacyBoundary: "Uses aggregate setup counts only; no custody, medical, caregiver, or private family detail.",
    explanation: "This deterministic rule reports current setup state. It does not change records or send notifications."
  };
}

function readinessFromCounts(blockingCount: number, attentionCount: number): TenantInviteReadiness {
  if (blockingCount > 0) return "blocked";
  if (attentionCount > 0) return "needs_setup";
  return "ready_to_invite";
}

export function buildTenantReadinessData(input: BuildTenantReadinessInput): TenantReadinessData {
  const tenants = input.organizations.map((organization) => {
    const orgSeasons = input.seasons
      .filter((season) => season.organization_id === organization.id)
      .sort(byNewestSeason);
    const activeSeason = orgSeasons.find((season) => season.status === "active");
    const activeTeams = activeSeason
      ? input.teams.filter((team) => (
        team.organization_id === organization.id &&
        team.season_id === activeSeason.id &&
        (team.status ?? "active") === "active"
      ))
      : [];
    const activeTeamIds = new Set(activeTeams.map((team) => team.id));
    const activePlayers = activeSeason
      ? input.players.filter((player) => (
        player.organization_id === organization.id &&
        player.season_id === activeSeason.id &&
        activeTeamIds.has(player.team_id) &&
        (player.roster_status ?? "active") === "active"
      ))
      : [];
    const activePlayerIds = new Set(activePlayers.map((player) => player.id));
    const coachCoveredTeamIds = new Set([
      ...activeTeams.filter((team) => Boolean(team.coach_user_id)).map((team) => team.id),
      ...input.teamMemberships
        .filter((membership) => (
          membership.role === "coach" &&
          membership.status === "active" &&
          activeTeamIds.has(membership.team_id)
        ))
        .map((membership) => membership.team_id)
    ]);
    const activeGuardianLinks = input.guardianLinks.filter((link) => (
      link.status === "active" &&
      activePlayerIds.has(link.player_id)
    ));
    const activeParentMemberships = input.teamMemberships.filter((membership) => (
      membership.role === "parent" &&
      membership.status === "active" &&
      activeTeamIds.has(membership.team_id)
    ));
    const pendingRegistrations = input.registrationRequests.filter((request) => (
      request.organization_id === organization.id &&
      request.status === "pending"
    ));
    const scheduledEvents = activeSeason
      ? input.events.filter((event) => (
        event.organization_id === organization.id &&
        event.season_id === activeSeason.id &&
        activeTeamIds.has(event.team_id) &&
        event.status === "scheduled"
      ))
      : [];

    const checks: TenantReadinessCheck[] = [
      check({
        id: "active-season",
        label: "Active season",
        status: activeSeason ? "ready" : "blocked",
        detail: activeSeason ? `${activeSeason.name} is active.` : "Create an active season before teams or invites can be trusted.",
        actionHref: "/admin/teams",
        actionLabel: "Set season"
      }),
      check({
        id: "active-teams",
        label: "Active teams",
        status: activeTeams.length ? "ready" : "blocked",
        detail: activeTeams.length ? `${activeTeams.length} active team(s) are attached to the season.` : "Add at least one active team for this season.",
        actionHref: "/admin/teams",
        actionLabel: "Add team"
      }),
      check({
        id: "coach-coverage",
        label: "Coach coverage",
        status: activeTeams.length && coachCoveredTeamIds.size === activeTeams.length ? "ready" : activeTeams.length ? "needs_attention" : "blocked",
        detail: activeTeams.length
          ? `${coachCoveredTeamIds.size} of ${activeTeams.length} active team(s) have coach assignment or membership.`
          : "Add teams before assigning coaches.",
        actionHref: "/admin/memberships",
        actionLabel: "Assign coaches"
      }),
      check({
        id: "roster",
        label: "Rostered players",
        status: activePlayers.length ? "ready" : activeTeams.length ? "needs_attention" : "blocked",
        detail: activePlayers.length ? `${activePlayers.length} active player(s) are rostered.` : "Add or import rostered players before inviting families.",
        actionHref: "/admin/teams",
        actionLabel: "Manage roster"
      }),
      check({
        id: "family-access",
        label: "Family access path",
        status: activeGuardianLinks.length || activeParentMemberships.length || pendingRegistrations.length ? "ready" : activePlayers.length ? "needs_attention" : "blocked",
        detail: activeGuardianLinks.length || activeParentMemberships.length
          ? `${activeGuardianLinks.length} active guardian link(s), ${activeParentMemberships.length} parent team membership(s).`
          : pendingRegistrations.length
            ? `${pendingRegistrations.length} pending registration request(s) can create family access after admin review.`
            : "Open registration or invite parents after roster review.",
        actionHref: "/admin/registrations",
        actionLabel: "Review access"
      }),
      check({
        id: "schedule",
        label: "Scheduled events",
        status: scheduledEvents.length ? "ready" : activeTeams.length ? "needs_attention" : "blocked",
        detail: scheduledEvents.length ? `${scheduledEvents.length} upcoming scheduled event(s) are visible.` : "Add at least one game, practice, or team event before launch.",
        actionHref: "/admin/schedule-venues",
        actionLabel: "Add schedule"
      }),
      check({
        id: "provider-boundary",
        label: "Notification boundary",
        status: "ready",
        detail: "Family notification records remain draft/internal until a provider-send slice is explicitly implemented.",
        actionHref: "/admin/message-delivery-review",
        actionLabel: "Review drafts"
      })
    ];

    const blockingCount = checks.filter((item) => item.status === "blocked").length;
    const attentionCount = checks.filter((item) => item.status === "needs_attention").length;

    return {
      organizationId: organization.id,
      organizationName: organization.name,
      activeSeasonId: activeSeason?.id,
      activeSeasonName: activeSeason?.name,
      readiness: readinessFromCounts(blockingCount, attentionCount),
      readyToInviteFamilies: blockingCount === 0,
      blockingCount,
      attentionCount,
      activeTeamCount: activeTeams.length,
      rosteredPlayerCount: activePlayers.length,
      activeCoachTeamCount: coachCoveredTeamIds.size,
      activeGuardianLinkCount: activeGuardianLinks.length,
      pendingRegistrationCount: pendingRegistrations.length,
      scheduledEventCount: scheduledEvents.length,
      checks
    };
  });

  return {
    tenants,
    source: "supabase",
    message: tenants.length
      ? "Tenant readiness is computed from Supabase rows visible to the signed-in organization admin."
      : "No organization-admin tenant scope is visible for this account."
  };
}

export async function listTenantReadinessData(input: {
  organizationIds: string[];
}): Promise<TenantReadinessData> {
  const organizationIds = Array.from(new Set(input.organizationIds.filter(Boolean)));
  if (!organizationIds.length) {
    return {
      tenants: [],
      source: "unavailable",
      message: "No organization-admin tenant scope is visible for this account."
    };
  }

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const [
      { data: organizations },
      { data: seasons },
      { data: teams },
      { data: players },
      { data: registrationRequests },
      { data: events }
    ] = await withSupabaseTimeout(Promise.all([
      db.from("organizations").select("id,name").in("id", organizationIds).order("name", { ascending: true }),
      db.from("seasons").select("id,organization_id,name,status,starts_at,ends_at").in("organization_id", organizationIds).order("starts_at", { ascending: false }),
      db.from("teams").select("id,organization_id,season_id,name,division,status,coach_user_id").in("organization_id", organizationIds),
      db.from("players").select("id,organization_id,team_id,season_id,roster_status").in("organization_id", organizationIds),
      db.from("registration_requests").select("id,organization_id,status").in("organization_id", organizationIds),
      db.from("events").select("id,organization_id,team_id,season_id,status").in("organization_id", organizationIds)
    ]), 7000) as [
      { data: OrganizationRow[] | null },
      { data: SeasonRow[] | null },
      { data: TeamRow[] | null },
      { data: PlayerRow[] | null },
      { data: RegistrationRequestRow[] | null },
      { data: EventRow[] | null }
    ];

    const teamIds = Array.from(new Set((teams ?? []).map((team) => team.id)));
    const playerIds = Array.from(new Set((players ?? []).map((player) => player.id)));
    const [{ data: teamMemberships }, { data: guardianLinks }] = await withSupabaseTimeout(Promise.all([
      teamIds.length
        ? db.from("team_memberships").select("team_id,user_id,role,status").in("team_id", teamIds)
        : Promise.resolve({ data: [] }),
      playerIds.length
        ? db.from("player_guardians").select("player_id,parent_user_id,status").in("player_id", playerIds)
        : Promise.resolve({ data: [] })
    ]), 7000) as [
      { data: TeamMembershipRow[] | null },
      { data: GuardianLinkRow[] | null }
    ];

    return buildTenantReadinessData({
      organizations: organizations ?? [],
      seasons: seasons ?? [],
      teams: teams ?? [],
      players: players ?? [],
      teamMemberships: teamMemberships ?? [],
      guardianLinks: guardianLinks ?? [],
      registrationRequests: registrationRequests ?? [],
      events: events ?? []
    });
  } catch {
    return {
      tenants: [],
      source: "unavailable",
      message: "Tenant readiness could not reach Supabase. Keep private tenant setup hidden until the admin data load succeeds."
    };
  }
}
