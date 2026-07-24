import type { TeamChatData } from "./team-chat";
import type { TeamPortalData } from "./team-portal";
import type { ScheduleOperationsData } from "./schedule-management";

export function scopeScheduleOperationsData(
  data: ScheduleOperationsData,
  teamIds: string[],
  message: string
): ScheduleOperationsData {
  const allowedTeamIds = new Set(teamIds);
  const teams = data.teams.filter((team) => allowedTeamIds.has(team.id));
  const organizationIds = new Set(teams.map((team) => team.organizationId));

  return {
    ...data,
    message,
    teams,
    events: data.events.filter((event) => allowedTeamIds.has(event.teamId)),
    fieldLocations: data.fieldLocations.filter((field) => organizationIds.has(field.organizationId))
  };
}

export function scopeTeamChatData(
  data: TeamChatData,
  teamIds: string[],
  viewerUserId: string
): TeamChatData {
  const allowedTeamIds = new Set(teamIds);
  const teams = data.teams.filter((team) => allowedTeamIds.has(team.id));
  const channels = data.channels.filter((channel) => allowedTeamIds.has(channel.teamId));
  const channelIds = new Set(channels.map((channel) => channel.id));
  const events = data.events.filter((event) => allowedTeamIds.has(event.teamId));
  const teamMemberships = data.teamMemberships.filter((membership) => allowedTeamIds.has(membership.teamId));
  const messages = data.messages.filter((message) => (
    allowedTeamIds.has(message.teamId) &&
    channelIds.has(message.channelId) &&
    message.moderationStatus !== "deleted"
  ));
  const userIds = new Set([
    viewerUserId,
    ...teamMemberships.map((membership) => membership.userId),
    ...messages.map((message) => message.authorUserId),
    ...messages.flatMap((message) => message.readByUserIds)
  ]);

  return {
    isSupabaseBacked: data.isSupabaseBacked,
    message: data.message,
    teams,
    users: data.users.filter((user) => userIds.has(user.id)),
    teamMemberships,
    events,
    channels,
    messages,
    moderationEvents: data.moderationEvents.filter((event) => allowedTeamIds.has(event.teamId))
  };
}

export function scopeTeamPortalData(
  data: TeamPortalData,
  teamIds: string[],
  options: {
    viewerUserId?: string;
    audience: "parent" | "coach" | "admin";
  }
): TeamPortalData {
  const allowedTeamIds = new Set(teamIds);
  const teams = data.teams.filter((team) => allowedTeamIds.has(team.id));
  const players = data.players.filter((player) => allowedTeamIds.has(player.teamId));
  const playerIds = new Set(players.map((player) => player.id));
  const guardianLinks = data.guardianLinks.filter((link) => (
    playerIds.has(link.playerId) &&
    (options.audience !== "parent" || link.parentUserId === options.viewerUserId)
  ));
  const visiblePlayerIds = options.audience === "parent"
    ? new Set(guardianLinks.map((link) => link.playerId))
    : playerIds;
  const visiblePlayers = players.filter((player) => visiblePlayerIds.has(player.id));
  const visibleTeamIds = new Set(visiblePlayers.map((player) => player.teamId));
  const membershipUserIds = new Set(data.teamMemberships
    .filter((membership) => allowedTeamIds.has(membership.teamId))
    .map((membership) => membership.userId));
  if (options.viewerUserId) membershipUserIds.add(options.viewerUserId);

  return {
    teams: options.audience === "parent"
      ? teams.filter((team) => visibleTeamIds.has(team.id))
      : teams,
    players: visiblePlayers,
    guardianLinks,
    parentInvites: options.audience === "parent"
      ? []
      : data.parentInvites.filter((invite) => allowedTeamIds.has(invite.teamId)),
    teamMemberships: data.teamMemberships.filter((membership) => allowedTeamIds.has(membership.teamId)),
    users: data.users.filter((user) => membershipUserIds.has(user.id)),
    events: data.events.filter((event) => allowedTeamIds.has(event.teamId)),
    mediaItems: data.mediaItems.filter((item) => allowedTeamIds.has(item.teamId)),
    parentReplays: data.parentReplays.filter((replay) => allowedTeamIds.has(replay.teamId))
  };
}
