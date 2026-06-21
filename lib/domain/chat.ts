import type {
  AppState,
  LeagueEvent,
  Team,
  TeamChatChannel,
  TeamChatMessage,
  User,
  UserRole
} from "./types";

export interface TeamChatAccess {
  canView: boolean;
  canPost: boolean;
  canAnnounce: boolean;
  canModerate: boolean;
  reason: string;
}

export interface TeamChatView {
  access: TeamChatAccess;
  channel: TeamChatChannel;
  team: Team;
  viewer: User;
  pinnedMessage?: TeamChatMessage;
  messages: TeamChatMessage[];
  upcomingGame?: LeagueEvent;
  gameDayMessages: TeamChatMessage[];
  unreadCount: number;
  safetyNote: string;
}

function activeMembershipFor(state: AppState, userId: string, teamId: string, role?: "coach" | "parent") {
  return state.teamMemberships.find((membership) => (
    membership.userId === userId &&
    membership.teamId === teamId &&
    membership.status === "active" &&
    (!role || membership.role === role)
  ));
}

function visibleMessagesForChannel(state: AppState, channelId: string) {
  return state.chatMessages
    .filter((message) => message.channelId === channelId && message.moderationStatus === "visible")
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
}

export function getTeamChatAccess(state: AppState, userId: string, teamId: string): TeamChatAccess {
  const user = state.users.find((item) => item.id === userId);
  if (!user) {
    return {
      canView: false,
      canPost: false,
      canAnnounce: false,
      canModerate: false,
      reason: "User was not found."
    };
  }

  if (user.role === "admin") {
    return {
      canView: true,
      canPost: true,
      canAnnounce: true,
      canModerate: true,
      reason: "Org admins can view and moderate every team chat."
    };
  }

  if (user.role === "coach" && activeMembershipFor(state, userId, teamId, "coach")) {
    return {
      canView: true,
      canPost: true,
      canAnnounce: true,
      canModerate: true,
      reason: "Assigned coaches can post announcements and moderate their team chat."
    };
  }

  if (user.role === "parent" && activeMembershipFor(state, userId, teamId, "parent")) {
    return {
      canView: true,
      canPost: true,
      canAnnounce: false,
      canModerate: false,
      reason: "Assigned parents can post in their own team chat."
    };
  }

  return {
    canView: false,
    canPost: false,
    canAnnounce: false,
    canModerate: false,
    reason: "Team chat is private to assigned parents, assigned coaches, and org admins."
  };
}

export function canModerateTeamChat(state: AppState, userId: string, teamId: string) {
  return getTeamChatAccess(state, userId, teamId).canModerate;
}

export function getTeamChatView(
  state: AppState,
  userId: string,
  teamId: string,
  now = new Date().toISOString()
): TeamChatView {
  const team = state.teams.find((item) => item.id === teamId);
  const viewer = state.users.find((item) => item.id === userId);
  const channel = state.teamChatChannels.find((item) => item.teamId === teamId);

  if (!team || !viewer || !channel) {
    throw new Error("Team chat view requires a known team, viewer, and channel.");
  }

  const access = getTeamChatAccess(state, userId, teamId);
  if (!access.canView) {
    throw new Error(access.reason);
  }

  const messages = visibleMessagesForChannel(state, channel.id);
  const pinnedMessage = channel.pinnedMessageId
    ? messages.find((message) => message.id === channel.pinnedMessageId)
    : messages.find((message) => message.pinned);
  const upcomingGame = state.events
    .filter((event) => (
      event.teamId === teamId &&
      event.eventType === "game" &&
      event.status === "scheduled" &&
      Date.parse(event.startsAt) >= Date.parse(now)
    ))
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))[0];
  const gameDayMessages = upcomingGame
    ? messages.filter((message) => message.eventId === upcomingGame.id)
    : [];

  return {
    access,
    channel,
    team,
    viewer,
    pinnedMessage,
    messages,
    upcomingGame,
    gameDayMessages,
    unreadCount: messages.filter((message) => (
      message.authorUserId !== userId &&
      !message.readByUserIds.includes(userId)
    )).length,
    safetyNote: "No child accounts or child direct messages. Player references use first name and last initial only."
  };
}

export function roleLabel(role: UserRole) {
  if (role === "admin") return "Org Admin";
  if (role === "coach") return "Coach";
  return "Parent";
}
