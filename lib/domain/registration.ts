import type { AppState, RegistrationRequest } from "./types";

export interface CreateRegistrationRequestInput {
  teamId: string;
  parentName: string;
  parentEmail: string;
  playerFirstName: string;
  playerLastInitial: string;
  now: string;
}

export interface RegistrationMutationResult {
  ok: boolean;
  message: string;
  state: AppState;
  request?: RegistrationRequest;
}

export function createRegistrationRequest(state: AppState, input: CreateRegistrationRequestInput): RegistrationMutationResult {
  const team = state.teams.find((item) => item.id === input.teamId);
  const parentName = input.parentName.trim();
  const parentEmail = input.parentEmail.trim().toLowerCase();
  const playerFirstName = input.playerFirstName.trim();
  const playerLastInitial = input.playerLastInitial.trim().slice(0, 1).toUpperCase();

  if (!team) return { ok: false, message: "Registration requires a known team.", state };
  if (!parentName || !playerFirstName || !playerLastInitial) {
    return { ok: false, message: "Parent name, player first name, and player last initial are required.", state };
  }
  if (!parentEmail.includes("@")) {
    return { ok: false, message: "Enter a valid parent email.", state };
  }

  const request: RegistrationRequest = {
    id: `registration-${Date.parse(input.now)}-${state.registrationRequests.length + 1}`,
    organizationId: team.organizationId,
    seasonId: team.seasonId,
    teamId: team.id,
    parentName,
    parentEmail,
    playerFirstName,
    playerLastInitial,
    status: "pending",
    createdAt: input.now
  };

  return {
    ok: true,
    message: "Registration request queued for admin review. No account access was granted.",
    request,
    state: {
      ...state,
      registrationRequests: [request, ...state.registrationRequests],
      auditEvents: [
        {
          id: `audit-registration-${Date.parse(input.now)}-${state.auditEvents.length + 1}`,
          actorUserId: "self-service",
          action: "registration_request_created",
          targetType: "registration_request",
          targetId: request.id,
          summary: `Registration request queued for ${playerFirstName} ${playerLastInitial}.`,
          createdAt: input.now
        },
        ...state.auditEvents
      ]
    }
  };
}
