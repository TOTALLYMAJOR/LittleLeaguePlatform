import type { AppState } from "./types";
import type { ProgramThemeKey } from "./types";

export interface TeamPortalBrandingInput {
  teamId: string;
  actorUserId: string;
  mascot: string;
  primaryColor: string;
  secondaryColor: string;
  themeKey: ProgramThemeKey;
  now: string;
}

export interface TeamPortalBrandingResult {
  ok: boolean;
  message: string;
  state: AppState;
}

const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

export function canUpdateTeamPortalBranding(state: AppState, actorUserId: string, teamId: string) {
  const actor = state.users.find((user) => user.id === actorUserId);
  if (!actor) return false;
  if (actor.role === "admin") return true;
  if (actor.role !== "coach") return false;
  return state.teamMemberships.some((membership) => (
    membership.teamId === teamId &&
    membership.userId === actorUserId &&
    membership.role === "coach" &&
    membership.status === "active"
  ));
}

export function updateTeamPortalBranding(state: AppState, input: TeamPortalBrandingInput): TeamPortalBrandingResult {
  const team = state.teams.find((item) => item.id === input.teamId);
  if (!team) return { ok: false, message: "Team portal branding requires a known team.", state };
  if (!canUpdateTeamPortalBranding(state, input.actorUserId, input.teamId)) {
    return { ok: false, message: "Only org admins or the assigned coach can update this team portal.", state };
  }

  const mascot = input.mascot.trim();
  if (mascot.length < 2 || mascot.length > 40) {
    return { ok: false, message: "Mascot must be 2-40 characters.", state };
  }
  if (!hexColorPattern.test(input.primaryColor) || !hexColorPattern.test(input.secondaryColor)) {
    return { ok: false, message: "Team colors must use #RRGGBB hex values.", state };
  }

  const updatedTeam = {
    ...team,
    mascot,
    primaryColor: input.primaryColor,
    secondaryColor: input.secondaryColor,
    themeKey: input.themeKey
  };

  return {
    ok: true,
    message: `${team.name} portal branding updated.`,
    state: {
      ...state,
      teams: state.teams.map((item) => item.id === team.id ? updatedTeam : item),
      auditEvents: [
        {
          id: `audit-team-branding-${Date.parse(input.now)}-${state.auditEvents.length + 1}`,
          actorUserId: input.actorUserId,
          action: "team_portal_branding_updated",
          targetType: "team",
          targetId: team.id,
          summary: `${team.name} portal colors and mascot updated.`,
          createdAt: input.now
        },
        ...state.auditEvents
      ]
    }
  };
}
