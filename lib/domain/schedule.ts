import type { AppState, EventStatus, EventType, LeagueEvent, NotificationChannel, NotificationRecord, UserRole } from "./types";

export interface ScheduleChangeInput {
  eventId: string;
  actorUserId: string;
  actorRole: UserRole;
  startsAt?: string;
  locationName?: string;
  status?: EventStatus;
  now: string;
}

export interface CreateScheduleEventInput {
  actorUserId: string;
  actorRole: UserRole;
  organizationId: string;
  seasonId: string;
  teamId: string;
  title: string;
  eventType: EventType;
  startsAt: string;
  endsAt: string;
  locationName: string;
  locationAddress: string;
  opponent?: string;
  now: string;
}

export interface ScheduleConflictInput {
  eventId?: string;
  teamId: string;
  startsAt: string;
  endsAt: string;
  locationName: string;
}

export interface RecurringEventPreviewInput {
  sourceEventId: string;
  count: number;
  intervalDays: number;
}

function actorCanEditEvent(state: AppState, actorUserId: string, actorRole: UserRole, teamId: string) {
  if (actorRole === "admin") return true;
  if (actorRole !== "coach") return false;
  return state.teamMemberships.some((membership) => membership.userId === actorUserId && membership.teamId === teamId && membership.role === "coach" && membership.status === "active");
}

function channelsForChange(status?: EventStatus): NotificationChannel[] {
  return status === "cancelled" ? ["push", "email", "sms"] : ["push", "email"];
}

function rangesOverlap(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  return new Date(leftStart).getTime() < new Date(rightEnd).getTime() &&
    new Date(leftEnd).getTime() > new Date(rightStart).getTime();
}

export function detectScheduleConflicts(state: AppState, input: ScheduleConflictInput) {
  return state.events
    .filter((event) => event.id !== input.eventId && event.status === "scheduled")
    .filter((event) => rangesOverlap(input.startsAt, input.endsAt, event.startsAt, event.endsAt))
    .flatMap((event) => {
      const reasons = [
        event.teamId === input.teamId ? "team overlap" : "",
        event.locationName.toLowerCase() === input.locationName.toLowerCase() ? "venue overlap" : ""
      ].filter(Boolean);
      return reasons.length ? [{ event, reasons }] : [];
    });
}

export function createScheduleEvent(state: AppState, input: CreateScheduleEventInput): { ok: boolean; message: string; state: AppState; event?: LeagueEvent } {
  if (!actorCanEditEvent(state, input.actorUserId, input.actorRole, input.teamId)) {
    return { ok: false, message: "Only org admins or assigned coaches can create events for this team.", state };
  }

  const conflicts = detectScheduleConflicts(state, input);
  if (conflicts.length) {
    return { ok: false, message: `${conflicts.length} schedule conflict(s) must be resolved before creating this event.`, state };
  }

  const event: LeagueEvent = {
    id: `event-${input.teamId}-${Date.parse(input.now)}`,
    organizationId: input.organizationId,
    teamId: input.teamId,
    seasonId: input.seasonId,
    title: input.title,
    eventType: input.eventType,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    locationName: input.locationName,
    locationAddress: input.locationAddress,
    status: "scheduled",
    opponent: input.opponent,
    createdAt: input.now,
    updatedAt: input.now
  };

  return {
    ok: true,
    message: `Created ${event.title}; schedule notifications still require review before provider delivery.`,
    state: {
      ...state,
      events: [...state.events, event],
      auditEvents: [
        {
          id: `audit-schedule-create-${Date.parse(input.now)}`,
          actorUserId: input.actorUserId,
          action: "schedule_event_created",
          targetType: "event",
          targetId: event.id,
          summary: `Created ${event.title} for schedule review.`,
          createdAt: input.now
        },
        ...state.auditEvents
      ]
    },
    event
  };
}

export function getVenueRecords(state: AppState) {
  const venues = new Map<string, {
    name: string;
    address: string;
    eventCount: number;
    nextEventAt?: string;
    teamNames: Set<string>;
  }>();

  state.events.forEach((event) => {
    const key = `${event.locationName.toLowerCase()}|${event.locationAddress.toLowerCase()}`;
    const teamName = state.teams.find((team) => team.id === event.teamId)?.name ?? "Team";
    const current = venues.get(key) ?? {
      name: event.locationName,
      address: event.locationAddress,
      eventCount: 0,
      nextEventAt: undefined,
      teamNames: new Set<string>()
    };
    current.eventCount += 1;
    current.teamNames.add(teamName);
    if (!current.nextEventAt || new Date(event.startsAt).getTime() < new Date(current.nextEventAt).getTime()) {
      current.nextEventAt = event.startsAt;
    }
    venues.set(key, current);
  });

  return Array.from(venues.values()).map((venue) => ({
    ...venue,
    teamNames: Array.from(venue.teamNames).sort()
  })).sort((left, right) => left.name.localeCompare(right.name));
}

export function previewRecurringEvents(state: AppState, input: RecurringEventPreviewInput) {
  const source = state.events.find((event) => event.id === input.sourceEventId);
  if (!source) return [];
  const durationMs = new Date(source.endsAt).getTime() - new Date(source.startsAt).getTime();
  return Array.from({ length: Math.max(input.count, 0) }, (_, index) => {
    const startsAt = new Date(new Date(source.startsAt).getTime() + input.intervalDays * (index + 1) * 24 * 60 * 60 * 1000).toISOString();
    return {
      ...source,
      id: `${source.id}-repeat-${index + 1}`,
      title: `${source.title} #${index + 2}`,
      startsAt,
      endsAt: new Date(new Date(startsAt).getTime() + durationMs).toISOString(),
      createdAt: source.createdAt,
      updatedAt: source.updatedAt
    };
  });
}

export function exportTeamCalendarIcs(state: AppState, teamId: string) {
  const events = state.events
    .filter((event) => event.teamId === teamId)
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Little League HQ//Schedule//EN"
  ];
  events.forEach((event) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@little-league-hq.local`,
      `SUMMARY:${event.title}`,
      `DTSTART:${event.startsAt.replace(/[-:]/g, "").replace(".000", "")}`,
      `DTEND:${event.endsAt.replace(/[-:]/g, "").replace(".000", "")}`,
      `LOCATION:${event.locationName}`,
      `STATUS:${event.status.toUpperCase()}`,
      "END:VEVENT"
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\n");
}

export function getScheduleRsvpSyncRows(state: AppState) {
  return state.events.map((event) => {
    const players = state.players.filter((player) => player.teamId === event.teamId);
    const rsvps = state.rsvps.filter((rsvp) => rsvp.eventId === event.id);
    return {
      event,
      going: rsvps.filter((rsvp) => rsvp.response === "going").length,
      maybe: rsvps.filter((rsvp) => rsvp.response === "maybe").length,
      notGoing: rsvps.filter((rsvp) => rsvp.response === "not_going").length,
      cancelled: rsvps.filter((rsvp) => rsvp.response === "cancelled").length,
      noResponse: Math.max(players.length - rsvps.length, 0)
    };
  });
}

export function previewScheduleChangeImpact(state: AppState, input: ScheduleChangeInput) {
  const event = state.events.find((item) => item.id === input.eventId);
  if (!event) {
    return {
      ok: false,
      message: "Event not found.",
      affectedFamilies: 0,
      rsvpdPlayers: 0,
      noResponsePlayers: 0,
      channels: [] as NotificationChannel[],
      notificationCount: 0,
      rsvps: []
    };
  }

  if (!actorCanEditEvent(state, input.actorUserId, input.actorRole, event.teamId)) {
    return {
      ok: false,
      message: "Only org admins or assigned coaches can change this event.",
      affectedFamilies: 0,
      rsvpdPlayers: 0,
      noResponsePlayers: 0,
      channels: [] as NotificationChannel[],
      notificationCount: 0,
      rsvps: []
    };
  }

  const teamPlayers = state.players.filter((player) => player.teamId === event.teamId);
  const activeParentIds = Array.from(new Set(
    state.guardianLinks
      .filter((link) => link.status === "active" && link.parentUserId && teamPlayers.some((player) => player.id === link.playerId))
      .map((link) => link.parentUserId!)
  ));
  const rsvps = state.rsvps.filter((rsvp) => rsvp.eventId === event.id);
  const channels = channelsForChange(input.status ?? event.status);

  return {
    ok: true,
    message: `${activeParentIds.length} family account(s), ${rsvps.length} RSVP response(s), and ${activeParentIds.length * channels.length} alert record(s) would be affected.`,
    affectedFamilies: activeParentIds.length,
    rsvpdPlayers: rsvps.length,
    noResponsePlayers: Math.max(teamPlayers.length - rsvps.length, 0),
    channels,
    notificationCount: activeParentIds.length * channels.length,
    rsvps: rsvps.map((rsvp) => ({
      ...rsvp,
      player: state.players.find((player) => player.id === rsvp.playerId),
      parentUser: state.users.find((user) => user.id === rsvp.parentUserId)
    }))
  };
}

export function applyScheduleChange(state: AppState, input: ScheduleChangeInput) {
  const event = state.events.find((item) => item.id === input.eventId);
  if (!event) return { ok: false, message: "Event not found.", state };
  if (!actorCanEditEvent(state, input.actorUserId, input.actorRole, event.teamId)) {
    return { ok: false, message: "Only org admins or assigned coaches can change this event.", state };
  }

  const updatedEvent = {
    ...event,
    startsAt: input.startsAt ?? event.startsAt,
    locationName: input.locationName ?? event.locationName,
    status: input.status ?? event.status,
    updatedAt: input.now
  };

  const affectedPlayers = state.players.filter((player) => player.teamId === event.teamId);
  const affectedParentIds = new Set(
    state.guardianLinks
      .filter((link) => link.status === "active" && link.parentUserId && affectedPlayers.some((player) => player.id === link.playerId))
      .map((link) => link.parentUserId!)
  );
  const team = state.teams.find((item) => item.id === event.teamId);
  const type = updatedEvent.status === "cancelled" ? "event_cancelled" : "schedule_changed";
  const body = updatedEvent.status === "cancelled"
    ? `${updatedEvent.title} has been cancelled.`
    : `${updatedEvent.title} is now ${new Date(updatedEvent.startsAt).toLocaleString()} at ${updatedEvent.locationName}.`;

  const notifications: NotificationRecord[] = [];
  affectedParentIds.forEach((recipientUserId) => {
    channelsForChange(updatedEvent.status).forEach((channel) => {
      notifications.push({
        id: `notification-${input.eventId}-${recipientUserId}-${channel}-${Date.parse(input.now)}`,
        organizationId: event.organizationId,
        recipientUserId,
        teamId: event.teamId,
        eventId: event.id,
        notificationType: type,
        title: updatedEvent.status === "cancelled" ? "Event cancelled" : "Schedule changed",
        body,
        channel,
        status: "pending",
        createdAt: input.now
      });
    });
  });

  return {
    ok: true,
    message: `${notifications.length} notification records queued for ${team?.name ?? "team"}; no provider send occurred.`,
    state: {
      ...state,
      events: state.events.map((item) => item.id === event.id ? updatedEvent : item),
      notifications: [...notifications, ...state.notifications],
      auditEvents: [
        {
          id: `audit-schedule-${Date.parse(input.now)}`,
          actorUserId: input.actorUserId,
          action: "schedule_change_queued",
          targetType: "event",
          targetId: event.id,
          summary: `Queued schedule change notifications for ${notifications.length} channel deliveries.`,
          createdAt: input.now
        },
        ...state.auditEvents
      ]
    }
  };
}
