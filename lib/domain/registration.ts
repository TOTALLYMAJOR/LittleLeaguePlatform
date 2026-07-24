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

export interface RegistrationInputValidation {
  ok: boolean;
  message: string;
  normalized?: {
    teamId: string;
    parentName: string;
    parentEmail: string;
    playerFirstName: string;
    playerLastInitial: string;
  };
}

export function validateRegistrationRequestInput(
  input: CreateRegistrationRequestInput,
  knownTeamIds: Iterable<string>
): RegistrationInputValidation {
  const normalized = {
    teamId: input.teamId.trim(),
    parentName: input.parentName.trim(),
    parentEmail: input.parentEmail.trim().toLowerCase(),
    playerFirstName: input.playerFirstName.trim(),
    playerLastInitial: input.playerLastInitial.trim().slice(0, 1).toUpperCase()
  };
  const knownTeams = new Set(knownTeamIds);

  if (!knownTeams.has(normalized.teamId)) {
    return { ok: false, message: "Choose the team your child is connected to." };
  }
  if (!normalized.parentName || !normalized.playerFirstName || !normalized.playerLastInitial) {
    return { ok: false, message: "Enter your name, your child’s first name, and your child’s last initial." };
  }
  if (!normalized.parentEmail.includes("@")) {
    return { ok: false, message: "Enter a valid email address." };
  }

  return {
    ok: true,
    message: "Your request is ready for league review. Private team details remain protected.",
    normalized
  };
}

export function createRegistrationRequest(state: AppState, input: CreateRegistrationRequestInput): RegistrationMutationResult {
  const team = state.teams.find((item) => item.id === input.teamId);
  const validation = validateRegistrationRequestInput(input, state.teams.map((item) => item.id));
  if (!validation.ok || !validation.normalized || !team) return { ok: false, message: validation.message, state };
  const { parentName, parentEmail, playerFirstName, playerLastInitial } = validation.normalized;

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
    message: "Your request is ready for league review. Private team details remain protected.",
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
