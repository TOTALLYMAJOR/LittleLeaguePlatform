import type { AppState, RsvpResponse } from "./types";

export interface SetRsvpInput {
  eventId: string;
  playerId: string;
  parentUserId: string;
  response: RsvpResponse;
  note?: string;
  now: string;
}

export interface SetRsvpResult {
  ok: boolean;
  message: string;
  state: AppState;
}

export function parentCanRsvpForPlayer(state: AppState, parentUserId: string, playerId: string) {
  return state.guardianLinks.some((link) => link.parentUserId === parentUserId && link.playerId === playerId && link.status === "active");
}

export function setRsvp(state: AppState, input: SetRsvpInput): SetRsvpResult {
  if (state.activeSeason.status === "archived") {
    return { ok: false, message: "Archived season RSVP data is read-only.", state };
  }

  const event = state.events.find((item) => item.id === input.eventId);
  const player = state.players.find((item) => item.id === input.playerId);
  if (!event || !player || event.teamId !== player.teamId) {
    return { ok: false, message: "Event and player must belong to the same team.", state };
  }

  if (!parentCanRsvpForPlayer(state, input.parentUserId, input.playerId)) {
    return { ok: false, message: "Parents can RSVP only for their linked child.", state };
  }

  const existing = state.rsvps.find((rsvp) => rsvp.eventId === input.eventId && rsvp.playerId === input.playerId);
  const rsvps = existing
    ? state.rsvps.map((rsvp) => rsvp.id === existing.id ? { ...rsvp, response: input.response, note: input.note, respondedAt: input.now, updatedAt: input.now } : rsvp)
    : [
        ...state.rsvps,
        {
          id: `rsvp-${input.eventId}-${input.playerId}`,
          eventId: input.eventId,
          playerId: input.playerId,
          parentUserId: input.parentUserId,
          response: input.response,
          note: input.note,
          respondedAt: input.now,
          createdAt: input.now,
          updatedAt: input.now
        }
      ];

  return {
    ok: true,
    message: `RSVP saved as ${input.response.replace("_", " ")}.`,
    state: { ...state, rsvps }
  };
}

export function getCoachRsvpSummaries(state: AppState, coachUserId: string, now = new Date().toISOString()) {
  const teamIds = new Set(state.teamMemberships.filter((membership) => membership.userId === coachUserId && membership.role === "coach" && membership.status === "active").map((membership) => membership.teamId));
  return state.events
    .filter((event) => teamIds.has(event.teamId) && event.status === "scheduled" && new Date(event.startsAt).getTime() >= new Date(now).getTime())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .map((event) => {
      const players = state.players.filter((player) => player.teamId === event.teamId);
      const rsvps = state.rsvps.filter((rsvp) => rsvp.eventId === event.id);
      const going = rsvps.filter((rsvp) => rsvp.response === "going").length;
      const maybe = rsvps.filter((rsvp) => rsvp.response === "maybe").length;
      const notGoing = rsvps.filter((rsvp) => rsvp.response === "not_going").length;
      return {
        event,
        team: state.teams.find((team) => team.id === event.teamId)!,
        going,
        maybe,
        notGoing,
        noResponse: Math.max(players.length - rsvps.length, 0),
        totalPlayers: players.length
      };
    });
}

export function getCoachRsvpReliability(state: AppState, coachUserId: string, now = new Date().toISOString()) {
  const nowMs = new Date(now).getTime();
  const teamIds = new Set(state.teamMemberships.filter((membership) => (
    membership.userId === coachUserId &&
    membership.role === "coach" &&
    membership.status === "active"
  )).map((membership) => membership.teamId));
  const assignedEvents = state.events.filter((event) => teamIds.has(event.teamId) && event.status === "scheduled" && new Date(event.startsAt).getTime() >= nowMs);
  const assignedPlayers = state.players.filter((player) => teamIds.has(player.teamId));
  const activeGuardianLinks = state.guardianLinks.filter((link) => (
    link.status === "active" &&
    link.parentUserId &&
    assignedPlayers.some((player) => player.id === link.playerId)
  ));
  const parentIds = Array.from(new Set(activeGuardianLinks.map((link) => link.parentUserId!)));

  return parentIds.map((parentUserId) => {
    const linkedPlayerIds = activeGuardianLinks
      .filter((link) => link.parentUserId === parentUserId)
      .map((link) => link.playerId);
    const linkedPlayers = assignedPlayers.filter((player) => linkedPlayerIds.includes(player.id));
    const relevantEventPlayerPairs = assignedEvents.flatMap((event) => (
      linkedPlayers
        .filter((player) => player.teamId === event.teamId)
        .map((player) => ({ event, player }))
    ));
    const responses = relevantEventPlayerPairs.flatMap(({ event, player }) => {
      const rsvp = state.rsvps.find((item) => item.eventId === event.id && item.playerId === player.id);
      return rsvp ? [rsvp] : [];
    });
    const lateChanges = responses.filter((rsvp) => rsvp.updatedAt !== rsvp.createdAt).length;
    const noResponse = Math.max(relevantEventPlayerPairs.length - responses.length, 0);
    const total = relevantEventPlayerPairs.length;
    const responseRate = total ? Math.round((responses.length / total) * 100) : 0;

    return {
      parentUser: state.users.find((user) => user.id === parentUserId),
      teams: Array.from(new Set(linkedPlayers.map((player) => player.teamId))).map((teamId) => state.teams.find((team) => team.id === teamId)).filter(Boolean),
      linkedPlayers,
      totalEvents: total,
      responded: responses.length,
      noResponse,
      lateChanges,
      responseRate,
      reminderMode: noResponse > 0 ? "Needs reminder" : lateChanges > 0 ? "Watch late changes" : "Reliable"
    };
  }).sort((left, right) => right.noResponse - left.noResponse || right.lateChanges - left.lateChanges || left.responseRate - right.responseRate);
}
