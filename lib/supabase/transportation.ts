import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Migration 0028 is staged ahead of generated provider types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(functionName: string, args: Record<string, unknown>): any;
};

export type TransportationDirection = "outbound" | "return";
export type TransportationState =
  | "open"
  | "awaiting_requester_acceptance"
  | "assigned"
  | "schedule_changed"
  | "cancelled"
  | "expired"
  | "withdrawn";

export interface TransportationEventOption {
  projectionId: string;
  eventId: string;
  playerId: string;
  childLabel: string;
  teamName: string;
  title: string;
  startsAt: string;
  scheduleVersion: number;
}

export interface TransportationRequestView {
  id: string;
  assignmentId?: string;
  eventId: string;
  playerId: string;
  childLabel: string;
  teamName: string;
  eventTitle: string;
  startsAt: string;
  direction: TransportationDirection;
  state: TransportationState;
  stateLabel: string;
  scheduleVersion: number;
  currentScheduleVersion: number;
  requestedByLabel: string;
  driverLabel?: string;
  seats?: number;
  requestedAt: string;
  canOffer: boolean;
  canAccept: boolean;
  canWithdrawRequest: boolean;
  canWithdrawAssignment: boolean;
  explanation: string;
}

export interface TransportationResponsibility {
  eventId: string;
  playerId: string;
  direction: TransportationDirection;
  state: "assigned" | "unassigned" | "needs_review";
  adultLabel?: string;
  scheduleVersion?: number;
}

export interface ParentTransportationData {
  ok: boolean;
  message: string;
  events: TransportationEventOption[];
  requests: TransportationRequestView[];
  responsibilities: TransportationResponsibility[];
}

type EventRow = {
  id: string;
  team_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "cancelled" | "completed";
  schedule_version: number | null;
};

type PlayerRow = {
  id: string;
  team_id: string;
  first_name: string;
  last_initial: string;
};

type RequestRow = {
  id: string;
  organization_id: string;
  team_id: string;
  event_id: string;
  player_id: string;
  requested_by_user_id: string;
  direction: TransportationDirection;
  schedule_version: number;
  status: "open" | "matched" | "withdrawn";
  requested_at: string;
};

type AssignmentRow = {
  id: string;
  request_id: string;
  requested_by_user_id: string;
  driver_user_id: string;
  direction: TransportationDirection;
  seats: number;
  schedule_version: number;
  status: "awaiting_requester_acceptance" | "assigned" | "withdrawn";
};

type RpcResult = {
  data: unknown;
  error: { message?: string } | null;
};

const requestColumns = [
  "id",
  "organization_id",
  "team_id",
  "event_id",
  "player_id",
  "requested_by_user_id",
  "direction",
  "schedule_version",
  "status",
  "requested_at"
].join(",");

const assignmentColumns = [
  "id",
  "request_id",
  "requested_by_user_id",
  "driver_user_id",
  "direction",
  "seats",
  "schedule_version",
  "status"
].join(",");

const safeMessages = new Set([
  "Choose outbound or return transportation.",
  "The child and event scope could not be verified.",
  "Transportation can be requested only for an upcoming scheduled event in the active season.",
  "The official event changed. Review the current schedule before requesting transportation.",
  "An active guardian link for this child is required.",
  "Transportation needs league review because a pickup restriction is recorded.",
  "A current transportation request already exists for this child, event, and direction.",
  "Seat count must be between 1 and 8.",
  "Transportation request is unavailable.",
  "This transportation request is no longer open.",
  "The requesting guardian cannot offer the same assignment.",
  "Transportation offers require an upcoming scheduled event.",
  "The official event changed. The requesting guardian must review and request again.",
  "Only an active guardian on this team can offer transportation.",
  "This guardian already has a current offer for the request.",
  "Transportation assignment is unavailable.",
  "This transportation assignment is no longer awaiting acceptance.",
  "Only the requesting guardian can accept this offer.",
  "Transportation can be assigned only for an upcoming scheduled event.",
  "The official event changed. Review the current schedule before accepting transportation.",
  "The requesting guardian link is no longer active.",
  "The offering guardian is no longer active on this team.",
  "Withdrawal reason must be 10 to 500 characters.",
  "Only the requesting guardian can withdraw this request.",
  "Only an open transportation request can be withdrawn.",
  "Only an adult on this assignment can withdraw it.",
  "This transportation assignment is no longer current."
]);

function unavailableMessage() {
  return "Transportation coordination is temporarily unavailable. No responsibility changed.";
}

function safeRpcMessage(message?: string) {
  return message && safeMessages.has(message) ? message : unavailableMessage();
}

function emptyData(message = unavailableMessage()): ParentTransportationData {
  return { ok: false, message, events: [], requests: [], responsibilities: [] };
}

export async function listParentTransportationData(parentUserId: string): Promise<ParentTransportationData> {
  if (!parentUserId) return emptyData("Signed-in parent access is required.");
  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const { data: guardianRows, error: guardianError } = await withSupabaseTimeout(db
      .from("player_guardians")
      .select("player_id")
      .eq("parent_user_id", parentUserId)
      .eq("status", "active"), 7000) as {
        data: Array<{ player_id: string }> | null;
        error?: { message?: string } | null;
      };
    if (guardianError) throw new Error("Guardian scope is unavailable.");
    const linkedPlayerIds = [...new Set((guardianRows ?? []).map((row) => row.player_id))];
    if (!linkedPlayerIds.length) {
      return { ok: true, message: "No active linked children are available for transportation.", events: [], requests: [], responsibilities: [] };
    }

    const { data: linkedPlayers, error: linkedPlayersError } = await withSupabaseTimeout(db
      .from("players")
      .select("id,team_id,first_name,last_initial")
      .in("id", linkedPlayerIds), 7000) as {
        data: PlayerRow[] | null;
        error?: { message?: string } | null;
      };
    if (linkedPlayersError) throw new Error("Linked children are unavailable.");
    const teamIds = [...new Set((linkedPlayers ?? []).map((player) => player.team_id))];
    if (!teamIds.length) return emptyData();

    const now = new Date().toISOString();
    const [
      { data: teams, error: teamsError },
      { data: events, error: eventsError },
      { data: requests, error: requestsError }
    ] = await withSupabaseTimeout(Promise.all([
      db.from("teams").select("id,name").in("id", teamIds),
      db.from("events")
        .select("id,team_id,title,starts_at,ends_at,status,schedule_version")
        .in("team_id", teamIds)
        .order("starts_at", { ascending: false })
        .limit(200),
      db.from("transportation_requests")
        .select(requestColumns)
        .in("team_id", teamIds)
        .order("requested_at", { ascending: false })
    ]), 7000) as [
      { data: Array<{ id: string; name: string }> | null; error?: { message?: string } | null },
      { data: EventRow[] | null; error?: { message?: string } | null },
      { data: RequestRow[] | null; error?: { message?: string } | null }
    ];
    if (teamsError || eventsError || requestsError) throw new Error("Transportation records are unavailable.");

    const requestRows = requests ?? [];
    const requestIds = requestRows.map((request) => request.id);
    const requestPlayerIds = [...new Set(requestRows.map((request) => request.player_id))];
    const [
      { data: requestPlayers, error: requestPlayersError },
      { data: assignments, error: assignmentsError }
    ] = await withSupabaseTimeout(Promise.all([
      requestPlayerIds.length
        ? db.from("players").select("id,team_id,first_name,last_initial").in("id", requestPlayerIds)
        : Promise.resolve({ data: [] }),
      requestIds.length
        ? db.from("transportation_assignments").select(assignmentColumns).in("request_id", requestIds)
        : Promise.resolve({ data: [] })
    ]), 7000) as [
      { data: PlayerRow[] | null; error?: { message?: string } | null },
      { data: AssignmentRow[] | null; error?: { message?: string } | null }
    ];
    if (requestPlayersError || assignmentsError) throw new Error("Transportation assignment details are unavailable.");

    const assignmentRows = assignments ?? [];
    const profileIds = [...new Set([
      ...requestRows.map((request) => request.requested_by_user_id),
      ...assignmentRows.map((assignment) => assignment.driver_user_id)
    ])];
    const { data: profiles, error: profilesError } = profileIds.length
      ? await withSupabaseTimeout(db.from("profiles").select("id,display_name").in("id", profileIds), 7000) as {
        data: Array<{ id: string; display_name: string }> | null;
        error?: { message?: string } | null;
      }
      : { data: [], error: null };
    if (profilesError) throw new Error("Transportation adult labels are unavailable.");

    return mapParentTransportationData({
      parentUserId,
      linkedPlayers: linkedPlayers ?? [],
      teams: teams ?? [],
      events: events ?? [],
      requests: requestRows,
      requestPlayers: requestPlayers ?? [],
      assignments: assignmentRows,
      profiles: profiles ?? [],
      now
    });
  } catch {
    return emptyData();
  }
}

export function mapParentTransportationData(input: {
  parentUserId: string;
  linkedPlayers: PlayerRow[];
  teams: Array<{ id: string; name: string }>;
  events: EventRow[];
  requests: RequestRow[];
  requestPlayers: PlayerRow[];
  assignments: AssignmentRow[];
  profiles: Array<{ id: string; display_name: string }>;
  now: string;
}): ParentTransportationData {
  const linkedPlayerIds = new Set(input.linkedPlayers.map((player) => player.id));
  const teamById = new Map(input.teams.map((team) => [team.id, team]));
  const eventById = new Map(input.events.map((event) => [event.id, event]));
  const playerById = new Map([...input.linkedPlayers, ...input.requestPlayers].map((player) => [player.id, player]));
  const profileById = new Map(input.profiles.map((profile) => [profile.id, profile.display_name]));
  const assignmentsByRequest = new Map<string, AssignmentRow[]>();
  for (const assignment of input.assignments) {
    assignmentsByRequest.set(assignment.request_id, [
      ...(assignmentsByRequest.get(assignment.request_id) ?? []),
      assignment
    ]);
  }

  const events = input.linkedPlayers
    .flatMap((player) => input.events
      .filter((event) => event.team_id === player.team_id && event.status === "scheduled" && Date.parse(event.starts_at) > Date.parse(input.now))
      .map((event): TransportationEventOption => ({
        projectionId: `${event.id}:${player.id}`,
        eventId: event.id,
        playerId: player.id,
        childLabel: childLabel(player),
        teamName: teamById.get(player.team_id)?.name ?? "Linked team",
        title: event.title,
        startsAt: event.starts_at,
        scheduleVersion: event.schedule_version ?? 1
      })))
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));

  const requests = input.requests.flatMap((request): TransportationRequestView[] => {
    const event = eventById.get(request.event_id);
    const player = playerById.get(request.player_id);
    if (!event || !player) return [];
    const currentAssignment = (assignmentsByRequest.get(request.id) ?? [])
      .find((assignment) => assignment.status === "assigned")
      ?? (assignmentsByRequest.get(request.id) ?? [])
        .find((assignment) => assignment.status === "awaiting_requester_acceptance");
    const isRequester = request.requested_by_user_id === input.parentUserId;
    const isLinkedChild = linkedPlayerIds.has(request.player_id);
    const isDriver = currentAssignment?.driver_user_id === input.parentUserId;
    if (request.status !== "open" && !isRequester && !isLinkedChild && !isDriver) return [];

    const currentVersion = event.schedule_version ?? 1;
    const state = deriveState({
      request,
      assignment: currentAssignment,
      event,
      currentVersion,
      now: input.now
    });
    const driverLabel = currentAssignment
      ? profileById.get(currentAssignment.driver_user_id) ?? "Team guardian"
      : undefined;
    const ownCurrentAssignment = Boolean(currentAssignment && (
      currentAssignment.requested_by_user_id === input.parentUserId ||
      currentAssignment.driver_user_id === input.parentUserId
    ));

    return [{
      id: request.id,
      assignmentId: currentAssignment?.id,
      eventId: request.event_id,
      playerId: request.player_id,
      childLabel: childLabel(player),
      teamName: teamById.get(request.team_id)?.name ?? "Linked team",
      eventTitle: event.title,
      startsAt: event.starts_at,
      direction: request.direction,
      state,
      stateLabel: stateLabel(state),
      scheduleVersion: request.schedule_version,
      currentScheduleVersion: currentVersion,
      requestedByLabel: profileById.get(request.requested_by_user_id) ?? "Linked guardian",
      driverLabel,
      seats: currentAssignment?.seats,
      requestedAt: request.requested_at,
      canOffer: state === "open" && !isRequester && !currentAssignment,
      canAccept: state === "awaiting_requester_acceptance" && isRequester,
      canWithdrawRequest: state === "open" && isRequester,
      canWithdrawAssignment: ownCurrentAssignment && (state === "awaiting_requester_acceptance" || state === "assigned"),
      explanation: stateExplanation(state, request.direction, driverLabel)
    }];
  });

  const responsibilities: TransportationResponsibility[] = requests.map((request) => ({
    eventId: request.eventId,
    playerId: request.playerId,
    direction: request.direction,
    state: request.state === "assigned"
      ? "assigned"
      : request.state === "schedule_changed"
        ? "needs_review"
        : "unassigned",
    adultLabel: request.state === "assigned" ? request.driverLabel : undefined,
    scheduleVersion: request.state === "assigned" ? request.scheduleVersion : undefined
  }));

  return {
    ok: true,
    message: "Current transportation requests and mutual acceptance evidence loaded.",
    events,
    requests,
    responsibilities
  };
}

function deriveState(input: {
  request: RequestRow;
  assignment?: AssignmentRow;
  event: EventRow;
  currentVersion: number;
  now: string;
}): TransportationState {
  if (input.request.status === "withdrawn") return "withdrawn";
  if (input.event.status === "cancelled") return "cancelled";
  if (Date.parse(input.event.starts_at) <= Date.parse(input.now)) return "expired";
  if (
    input.request.schedule_version !== input.currentVersion ||
    (input.assignment && input.assignment.schedule_version !== input.currentVersion)
  ) return "schedule_changed";
  if (input.assignment?.status === "assigned") return "assigned";
  if (input.assignment?.status === "awaiting_requester_acceptance") return "awaiting_requester_acceptance";
  return "open";
}

function stateLabel(state: TransportationState) {
  return {
    open: "Requested",
    awaiting_requester_acceptance: "Offered · awaiting your confirmation",
    assigned: "Accepted",
    schedule_changed: "Needs review · schedule changed",
    cancelled: "Event cancelled",
    expired: "Past event",
    withdrawn: "Withdrawn"
  }[state];
}

function stateExplanation(state: TransportationState, direction: TransportationDirection, driverLabel?: string) {
  const directionLabel = direction === "outbound" ? "outbound" : "return";
  if (state === "assigned") return `${driverLabel ?? "A team guardian"} accepted and the requesting guardian accepted. ${directionLabel} responsibility is assigned at the current event version.`;
  if (state === "awaiting_requester_acceptance") return `${driverLabel ?? "A team guardian"} offered and accepted the driver side. ${directionLabel} responsibility remains unassigned until the requesting guardian accepts.`;
  if (state === "schedule_changed") return `The official event version changed. Earlier ${directionLabel} acceptance remains in history but is not current responsibility.`;
  if (state === "cancelled") return "The official event is cancelled. Transportation is not current.";
  if (state === "expired") return "The event window has passed. This transportation record is historical.";
  if (state === "withdrawn") return `${directionLabel} coordination was withdrawn. Responsibility is not assigned.`;
  return `${directionLabel} transportation is requested. No adult is assigned yet.`;
}

function childLabel(player: PlayerRow) {
  return `${player.first_name} ${player.last_initial}.`;
}

async function callTransportationRpc(functionName: string, args: Record<string, unknown>) {
  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const { data, error } = await withSupabaseTimeout(db.rpc(functionName, args), 7000) as RpcResult;
    if (error) return { ok: false, message: safeRpcMessage(error.message) };
    return { ok: true, message: "Transportation record updated. No provider message was sent.", result: data };
  } catch {
    return { ok: false, message: unavailableMessage() };
  }
}

export function requestTransportation(input: {
  eventId: string;
  playerId: string;
  actorUserId: string;
  direction: TransportationDirection;
  expectedScheduleVersion: number;
}) {
  return callTransportationRpc("request_event_transportation", {
    target_event_id: input.eventId,
    target_player_id: input.playerId,
    requesting_user_id: input.actorUserId,
    target_direction: input.direction,
    expected_schedule_version: input.expectedScheduleVersion
  });
}

export function offerTransportation(input: {
  requestId: string;
  actorUserId: string;
  seats: number;
}) {
  return callTransportationRpc("offer_event_transportation", {
    target_request_id: input.requestId,
    offering_user_id: input.actorUserId,
    seat_count: input.seats
  });
}

export function acceptTransportationAssignment(input: {
  assignmentId: string;
  actorUserId: string;
  expectedScheduleVersion: number;
}) {
  return callTransportationRpc("accept_transportation_assignment", {
    target_assignment_id: input.assignmentId,
    accepting_user_id: input.actorUserId,
    expected_schedule_version: input.expectedScheduleVersion
  });
}

export function withdrawTransportationRequest(input: {
  requestId: string;
  actorUserId: string;
  reason: string;
}) {
  return callTransportationRpc("withdraw_transportation_request", {
    target_request_id: input.requestId,
    withdrawing_user_id: input.actorUserId,
    withdrawal_explanation: input.reason
  });
}

export function withdrawTransportationAssignment(input: {
  assignmentId: string;
  actorUserId: string;
  reason: string;
}) {
  return callTransportationRpc("withdraw_transportation_assignment", {
    target_assignment_id: input.assignmentId,
    withdrawing_user_id: input.actorUserId,
    withdrawal_explanation: input.reason
  });
}
