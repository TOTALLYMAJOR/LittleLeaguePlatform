import type { AppState, EventStatus, NotificationChannel, NotificationRecord, UserRole } from "./types";

export interface ScheduleChangeInput {
  eventId: string;
  actorUserId: string;
  actorRole: UserRole;
  startsAt?: string;
  locationName?: string;
  status?: EventStatus;
  now: string;
}

function actorCanEditEvent(state: AppState, actorUserId: string, actorRole: UserRole, teamId: string) {
  if (actorRole === "admin") return true;
  if (actorRole !== "coach") return false;
  return state.teamMemberships.some((membership) => membership.userId === actorUserId && membership.teamId === teamId && membership.role === "coach" && membership.status === "active");
}

function channelsForChange(status?: EventStatus): NotificationChannel[] {
  return status === "cancelled" ? ["push", "email", "sms"] : ["push", "email"];
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
