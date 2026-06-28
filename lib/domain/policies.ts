import {
  GUARDIAN_LINK_STATUSES,
  TEAM_MEMBERSHIP_ROLES,
  TEAM_MEMBERSHIP_STATUSES,
  USER_ROLES,
  type AppState,
  type AuditEvent,
  type LeagueEvent,
  type Player,
  type Team,
  type UserRole,
  type WeatherAlert
} from "./contracts";

export interface DomainPolicyActor {
  userId: string;
  role: UserRole;
  organizationId?: string;
}

const ADMIN_ROLE = USER_ROLES[0];
const COACH_ROLE = USER_ROLES[1];
const PARENT_ROLE = USER_ROLES[2];
const COACH_MEMBERSHIP_ROLE = TEAM_MEMBERSHIP_ROLES[0];
const PARENT_MEMBERSHIP_ROLE = TEAM_MEMBERSHIP_ROLES[1];
const ACTIVE_TEAM_MEMBERSHIP_STATUS = TEAM_MEMBERSHIP_STATUSES[0];
const ACTIVE_GUARDIAN_LINK_STATUS = GUARDIAN_LINK_STATUSES[1];

export function canViewParentDashboardPanel(actor: DomainPolicyActor) {
  return actor.role === PARENT_ROLE;
}

export function canViewCoachTeamPanel(state: AppState, actor: DomainPolicyActor) {
  return actor.role === ADMIN_ROLE || (
    actor.role === COACH_ROLE &&
    getVisibleTeamIds(state, actor).size > 0
  );
}

export function canViewAdminAuditPanel(actor: DomainPolicyActor) {
  return actor.role === ADMIN_ROLE;
}

export function getVisibleTeamIds(state: AppState, actor: DomainPolicyActor) {
  if (!actorCanAccessOrganization(state, actor)) return new Set<string>();

  if (actor.role === ADMIN_ROLE) {
    return new Set(state.teams.map((team) => team.id));
  }

  if (actor.role === COACH_ROLE) {
    return new Set([
      ...state.teamMemberships
        .filter((membership) => (
          membership.userId === actor.userId &&
          membership.role === COACH_MEMBERSHIP_ROLE &&
          membership.status === ACTIVE_TEAM_MEMBERSHIP_STATUS
        ))
        .map((membership) => membership.teamId),
      ...state.teams
        .filter((team) => team.coachUserId === actor.userId)
        .map((team) => team.id)
    ]);
  }

  if (actor.role === PARENT_ROLE) {
    const linkedPlayerIds = new Set(state.guardianLinks
      .filter((link) => (
        link.parentUserId === actor.userId &&
        link.status === ACTIVE_GUARDIAN_LINK_STATUS
      ))
      .map((link) => link.playerId));

    return new Set([
      ...state.players
        .filter((player) => linkedPlayerIds.has(player.id))
        .map((player) => player.teamId),
      ...state.teamMemberships
        .filter((membership) => (
          membership.userId === actor.userId &&
          membership.role === PARENT_MEMBERSHIP_ROLE &&
          membership.status === ACTIVE_TEAM_MEMBERSHIP_STATUS
        ))
        .map((membership) => membership.teamId)
    ]);
  }

  return new Set<string>();
}

export function getVisibleTeams(state: AppState, actor: DomainPolicyActor): Team[] {
  const teamIds = getVisibleTeamIds(state, actor);
  return state.teams.filter((team) => teamIds.has(team.id));
}

export function getVisiblePlayers(state: AppState, actor: DomainPolicyActor): Player[] {
  if (actor.role === PARENT_ROLE) {
    const linkedPlayerIds = new Set(state.guardianLinks
      .filter((link) => (
        link.parentUserId === actor.userId &&
        link.status === ACTIVE_GUARDIAN_LINK_STATUS
      ))
      .map((link) => link.playerId));
    return state.players.filter((player) => linkedPlayerIds.has(player.id));
  }

  const teamIds = getVisibleTeamIds(state, actor);
  return state.players.filter((player) => teamIds.has(player.teamId));
}

export function getVisibleEvents(state: AppState, actor: DomainPolicyActor): LeagueEvent[] {
  const teamIds = getVisibleTeamIds(state, actor);
  return state.events.filter((event) => teamIds.has(event.teamId));
}

export function getVisibleWeatherAlerts(state: AppState, actor: DomainPolicyActor): WeatherAlert[] {
  const teamIds = getVisibleTeamIds(state, actor);
  return state.weatherAlerts.filter((alert) => teamIds.has(alert.teamId));
}

export function getVisibleAuditEvents(state: AppState, actor: DomainPolicyActor): AuditEvent[] {
  if (!canViewAdminAuditPanel(actor) || !actorCanAccessOrganization(state, actor)) return [];
  return state.auditEvents;
}

function actorCanAccessOrganization(state: AppState, actor: DomainPolicyActor) {
  return !actor.organizationId || actor.organizationId === state.organization.id;
}
