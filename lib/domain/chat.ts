import type {
  AppState,
  ChatAnnouncementTopic,
  ChatModerationAction,
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

export interface PostTeamChatMessageInput {
  teamId: string;
  authorUserId: string;
  body: string;
  eventId?: string;
  now: string;
}

export interface SendCoachAnnouncementInput {
  teamId: string;
  authorUserId: string;
  body: string;
  topic: ChatAnnouncementTopic;
  eventId?: string;
  pinned?: boolean;
  now: string;
}

export interface ModerateTeamChatMessageInput {
  messageId: string;
  actorUserId: string;
  action: ChatModerationAction;
  reason: string;
  now: string;
}

export interface ChatMutationResult {
  ok: boolean;
  message: string;
  state: AppState;
  createdMessage?: TeamChatMessage;
  moderatedMessage?: TeamChatMessage;
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

export function postTeamChatMessage(state: AppState, input: PostTeamChatMessageInput): ChatMutationResult {
  const author = state.users.find((user) => user.id === input.authorUserId);
  const channel = state.teamChatChannels.find((item) => item.teamId === input.teamId);
  const trimmedBody = input.body.trim();
  const access = getTeamChatAccess(state, input.authorUserId, input.teamId);

  if (!author || !channel) {
    return { ok: false, message: "Team Chat requires a known author and channel.", state };
  }

  if (!access.canPost) {
    return { ok: false, message: access.reason, state };
  }

  if (!trimmedBody) {
    return { ok: false, message: "Write a message before sending.", state };
  }

  const event = input.eventId ? state.events.find((item) => item.id === input.eventId) : undefined;
  if (input.eventId && (!event || event.teamId !== input.teamId)) {
    return { ok: false, message: "Game-day messages must link to an event for this team.", state };
  }

  const createdMessage: TeamChatMessage = {
    id: `chat-msg-${Date.parse(input.now)}-${state.chatMessages.length + 1}`,
    channelId: channel.id,
    organizationId: channel.organizationId,
    teamId: input.teamId,
    authorUserId: input.authorUserId,
    authorRole: author.role,
    kind: "message",
    body: trimmedBody,
    eventId: input.eventId,
    pinned: false,
    moderationStatus: "visible",
    readByUserIds: [input.authorUserId],
    createdAt: input.now
  };

  return {
    ok: true,
    message: "Team Chat message posted.",
    createdMessage,
    state: {
      ...state,
      teamChatChannels: state.teamChatChannels.map((item) => (
        item.id === channel.id ? { ...item, updatedAt: input.now } : item
      )),
      chatMessages: [...state.chatMessages, createdMessage],
      auditEvents: [
        {
          id: `audit-team-chat-post-${Date.parse(input.now)}-${state.auditEvents.length + 1}`,
          actorUserId: input.authorUserId,
          action: "team_chat_message_posted",
          targetType: "team_chat_message",
          targetId: createdMessage.id,
          summary: "Team Chat message posted in an assigned team channel.",
          createdAt: input.now
        },
        ...state.auditEvents
      ]
    }
  };
}

export function sendCoachAnnouncement(state: AppState, input: SendCoachAnnouncementInput): ChatMutationResult {
  const author = state.users.find((user) => user.id === input.authorUserId);
  const channel = state.teamChatChannels.find((item) => item.teamId === input.teamId);
  const trimmedBody = input.body.trim();
  const access = getTeamChatAccess(state, input.authorUserId, input.teamId);

  if (!author || !channel) {
    return { ok: false, message: "Coach Note requires a known author and channel.", state };
  }

  if (!access.canAnnounce) {
    return { ok: false, message: "Only assigned coaches and org admins can send Coach Notes.", state };
  }

  if (!trimmedBody) {
    return { ok: false, message: "Write a Coach Note before sending.", state };
  }

  const event = input.eventId ? state.events.find((item) => item.id === input.eventId) : undefined;
  if (input.eventId && (!event || event.teamId !== input.teamId)) {
    return { ok: false, message: "Coach Notes can only link to events for this team.", state };
  }

  const createdMessage: TeamChatMessage = {
    id: `chat-announcement-${Date.parse(input.now)}-${state.chatMessages.length + 1}`,
    channelId: channel.id,
    organizationId: channel.organizationId,
    teamId: input.teamId,
    authorUserId: input.authorUserId,
    authorRole: author.role,
    kind: "announcement",
    topic: input.topic,
    body: trimmedBody,
    eventId: input.eventId,
    pinned: Boolean(input.pinned),
    moderationStatus: "visible",
    readByUserIds: [input.authorUserId],
    createdAt: input.now
  };

  return {
    ok: true,
    message: input.pinned ? "Coach Note posted and pinned." : "Coach Note posted.",
    createdMessage,
    state: {
      ...state,
      teamChatChannels: state.teamChatChannels.map((item) => (
        item.id === channel.id
          ? { ...item, pinnedMessageId: input.pinned ? createdMessage.id : item.pinnedMessageId, updatedAt: input.now }
          : item
      )),
      chatMessages: [...state.chatMessages, createdMessage],
      auditEvents: [
        {
          id: `audit-coach-note-${Date.parse(input.now)}-${state.auditEvents.length + 1}`,
          actorUserId: input.authorUserId,
          action: "coach_announcement_posted",
          targetType: "team_chat_message",
          targetId: createdMessage.id,
          summary: input.pinned ? "Coach Note posted and pinned in Team Chat." : "Coach Note posted in Team Chat.",
          createdAt: input.now
        },
        ...state.auditEvents
      ]
    }
  };
}

export function moderateTeamChatMessage(state: AppState, input: ModerateTeamChatMessageInput): ChatMutationResult {
  const actor = state.users.find((user) => user.id === input.actorUserId);
  const message = state.chatMessages.find((item) => item.id === input.messageId);
  if (!actor || !message) {
    return { ok: false, message: "Moderation requires a known actor and message.", state };
  }

  const access = getTeamChatAccess(state, input.actorUserId, message.teamId);
  if (!access.canModerate) {
    return { ok: false, message: "Only assigned coaches and org admins can moderate Team Chat messages.", state };
  }

  const reason = input.reason.trim();
  if (!reason) {
    return { ok: false, message: "A moderation reason is required.", state };
  }

  const nextStatus = input.action === "message_restored"
    ? "visible"
    : input.action === "message_deleted"
      ? "deleted"
      : "hidden";
  const moderatedMessage: TeamChatMessage = {
    ...message,
    moderationStatus: nextStatus,
    deletedAt: nextStatus === "deleted" ? input.now : message.deletedAt,
    moderatedAt: input.now,
    moderatedByUserId: input.actorUserId,
    moderationReason: reason
  };
  const auditEvent = {
    id: `chat-audit-${Date.parse(input.now)}-${state.chatModerationAuditEvents.length + 1}`,
    messageId: message.id,
    channelId: message.channelId,
    teamId: message.teamId,
    actorUserId: input.actorUserId,
    actorRole: actor.role,
    action: input.action,
    reason,
    createdAt: input.now
  };

  return {
    ok: true,
    message: "Team Chat moderation recorded.",
    moderatedMessage,
    state: {
      ...state,
      chatMessages: state.chatMessages.map((item) => item.id === message.id ? moderatedMessage : item),
      chatModerationAuditEvents: [auditEvent, ...state.chatModerationAuditEvents],
      auditEvents: [
        {
          id: `audit-team-chat-moderation-${Date.parse(input.now)}-${state.auditEvents.length + 1}`,
          actorUserId: input.actorUserId,
          action: input.action,
          targetType: "team_chat_message",
          targetId: message.id,
          summary: `Team Chat moderation recorded: ${input.action}.`,
          createdAt: input.now
        },
        ...state.auditEvents
      ]
    }
  };
}

export function getTeamChatReportingSummary(state: AppState, teamId: string) {
  const messages = state.chatMessages.filter((message) => message.teamId === teamId);
  return {
    totalMessages: messages.length,
    hiddenMessages: messages.filter((message) => message.moderationStatus === "hidden").length,
    deletedMessages: messages.filter((message) => message.moderationStatus === "deleted").length,
    reportableMessages: messages.filter((message) => message.moderationStatus === "visible").length
  };
}

export function getTeamChatRetentionJobs(state: AppState, teamId: string) {
  const channel = state.teamChatChannels.find((item) => item.teamId === teamId);
  return [{
    id: `retention-${teamId}`,
    title: "Chat retention cleanup",
    status: channel ? "ready" as const : "blocked" as const,
    detail: channel
      ? "Delete or redact chat bodies only after archive exports and admin approval are complete."
      : "Create a team chat channel before retention cleanup can be scheduled."
  }];
}

export function getMediaMessagePolicyScreens() {
  return [
    { title: "No child accounts", detail: "Only assigned adults can post or moderate team messages." },
    { title: "Private team context", detail: "Messages, media, and reports stay scoped to the assigned team." },
    { title: "Human moderation", detail: "Coach/admin moderation records an audit event before hiding or deleting content." }
  ];
}
