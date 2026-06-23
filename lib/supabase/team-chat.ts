import { seedState, type ChatModerationAction, type ChatModerationAuditEvent, type ChatMessageKind, type LeagueEvent, type Team, type TeamChatChannel, type TeamChatMessage, type TeamMembership, type User, type UserRole } from "@/lib/domain";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

export interface TeamChatData {
  teams: Team[];
  users: User[];
  teamMemberships: TeamMembership[];
  events: LeagueEvent[];
  channels: TeamChatChannel[];
  messages: TeamChatMessage[];
  moderationEvents: ChatModerationAuditEvent[];
}

export interface TeamChatMutationResult {
  ok: boolean;
  message: string;
  createdMessage?: TeamChatMessage;
  moderatedMessage?: TeamChatMessage;
}

type MessageRow = {
  id: string;
  organization_id: string;
  season_id?: string;
  team_id: string;
  channel_id: string;
  event_id: string | null;
  author_user_id: string;
  author_role: UserRole;
  message_kind: ChatMessageKind;
  announcement_topic: TeamChatMessage["topic"] | null;
  body: string;
  pinned: boolean;
  moderation_status: TeamChatMessage["moderationStatus"];
  read_by_user_ids: string[];
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  moderated_at: string | null;
  moderated_by_user_id: string | null;
  moderation_reason: string | null;
};

function mapTeam(row: {
  id: string;
  organization_id: string;
  season_id: string;
  division: string;
  name: string;
  coach_user_id: string | null;
  mascot: string;
  primary_color: string;
  secondary_color: string;
  theme_key: Team["themeKey"];
}): Team {
  return {
    id: row.id,
    organizationId: row.organization_id,
    seasonId: row.season_id,
    division: row.division,
    name: row.name,
    coachUserId: row.coach_user_id ?? undefined,
    mascot: row.mascot,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    themeKey: row.theme_key
  };
}

export function mapTeamChatMessageRow(row: MessageRow): TeamChatMessage {
  return {
    id: row.id,
    channelId: row.channel_id,
    organizationId: row.organization_id,
    teamId: row.team_id,
    authorUserId: row.author_user_id,
    authorRole: row.author_role,
    kind: row.message_kind,
    topic: row.announcement_topic ?? undefined,
    body: row.body,
    eventId: row.event_id ?? undefined,
    pinned: row.pinned,
    moderationStatus: row.moderation_status,
    readByUserIds: row.read_by_user_ids,
    createdAt: row.created_at,
    editedAt: row.edited_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    moderatedAt: row.moderated_at ?? undefined,
    moderatedByUserId: row.moderated_by_user_id ?? undefined,
    moderationReason: row.moderation_reason ?? undefined
  };
}

function fallbackChatData(): TeamChatData {
  return {
    teams: seedState.teams,
    users: seedState.users,
    teamMemberships: seedState.teamMemberships,
    events: seedState.events,
    channels: seedState.teamChatChannels,
    messages: seedState.chatMessages,
    moderationEvents: seedState.chatModerationAuditEvents
  };
}

async function actorCanPost(teamId: string, actorUserId: string) {
  const supabase = createSupabaseAdminClient();
  const [{ data: actor }, { data: team }, { data: membership }] = await withSupabaseTimeout(Promise.all([
    supabase.from("profiles").select("id,default_role").eq("id", actorUserId).single(),
    supabase.from("teams").select("id,organization_id,season_id").eq("id", teamId).single(),
    supabase
      .from("team_memberships")
      .select("id,role,status")
      .eq("team_id", teamId)
      .eq("user_id", actorUserId)
      .eq("status", "active")
  ]), 7000);

  if (!actor || !team) return null;
  const isMember = Boolean(membership?.length);
  const isAdmin = actor.default_role === "admin";
  if (!isMember && !isAdmin) return null;
  return { supabase, actor, team, memberships: membership ?? [], canModerate: isAdmin || membership?.some((item) => item.role === "coach") };
}

export async function listTeamChatData(): Promise<TeamChatData> {
  try {
    const supabase = createSupabaseAdminClient();
    const [teamsResult, profilesResult, membershipsResult, eventsResult] = await withSupabaseTimeout(Promise.all([
      supabase.from("teams").select("id,organization_id,season_id,division,name,coach_user_id,mascot,primary_color,secondary_color,theme_key").order("division", { ascending: true }).order("name", { ascending: true }),
      supabase.from("profiles").select("id,display_name,email,phone,default_role").order("display_name", { ascending: true }),
      supabase.from("team_memberships").select("id,team_id,user_id,role,status").order("created_at", { ascending: false }),
      supabase.from("events").select("id,organization_id,team_id,season_id,title,event_type,starts_at,ends_at,location_name,location_address,status,opponent,created_at,updated_at").order("starts_at", { ascending: true })
    ]), 7000);

    if (teamsResult.error || profilesResult.error || membershipsResult.error || eventsResult.error || !teamsResult.data?.length) {
      return fallbackChatData();
    }

    const teams = teamsResult.data.map(mapTeam);
    await withSupabaseTimeout(Promise.all(teams.map((team) => supabase
      .from("team_chat_channels")
      .upsert({
        organization_id: team.organizationId,
        season_id: team.seasonId,
        team_id: team.id
      }, { onConflict: "team_id" }))), 7000);

    const [channelsResult, messagesResult, moderationResult] = await withSupabaseTimeout(Promise.all([
      supabase.from("team_chat_channels").select("id,organization_id,season_id,team_id,pinned_message_id,created_at,updated_at").order("created_at", { ascending: true }),
      supabase.from("team_chat_messages").select("id,organization_id,season_id,team_id,channel_id,event_id,author_user_id,author_role,message_kind,announcement_topic,body,pinned,moderation_status,read_by_user_ids,created_at,edited_at,deleted_at,moderated_at,moderated_by_user_id,moderation_reason").order("created_at", { ascending: true }).limit(200),
      supabase.from("chat_moderation_audit_events").select("id,message_id,channel_id,team_id,actor_user_id,actor_role,action,reason,created_at").order("created_at", { ascending: false }).limit(100)
    ]), 7000);

    return {
      teams,
      users: (profilesResult.data ?? []).map((profile) => ({
        id: profile.id,
        role: profile.default_role,
        name: profile.display_name,
        email: profile.email,
        phone: profile.phone ?? undefined
      })),
      teamMemberships: (membershipsResult.data ?? []).map((membership) => ({
        id: membership.id,
        teamId: membership.team_id,
        userId: membership.user_id,
        role: membership.role,
        status: membership.status
      })),
      events: (eventsResult.data ?? []).map((event) => ({
        id: event.id,
        organizationId: event.organization_id,
        teamId: event.team_id,
        seasonId: event.season_id,
        title: event.title,
        eventType: event.event_type,
        startsAt: event.starts_at,
        endsAt: event.ends_at,
        locationName: event.location_name ?? "Location TBD",
        locationAddress: event.location_address ?? "Address TBD",
        status: event.status,
        opponent: event.opponent ?? undefined,
        createdAt: event.created_at,
        updatedAt: event.updated_at
      })),
      channels: (channelsResult.data ?? []).map((channel) => ({
        id: channel.id,
        organizationId: channel.organization_id,
        seasonId: channel.season_id,
        teamId: channel.team_id,
        pinnedMessageId: channel.pinned_message_id ?? undefined,
        createdAt: channel.created_at,
        updatedAt: channel.updated_at
      })),
      messages: (messagesResult.data ?? []).map(mapTeamChatMessageRow),
      moderationEvents: (moderationResult.data ?? []).map((event) => ({
        id: event.id,
        messageId: event.message_id,
        channelId: event.channel_id,
        teamId: event.team_id,
        actorUserId: event.actor_user_id,
        actorRole: event.actor_role,
        action: event.action,
        reason: event.reason,
        createdAt: event.created_at
      }))
    };
  } catch {
    return fallbackChatData();
  }
}

export async function postSupabaseTeamChatMessage(input: {
  teamId: string;
  authorUserId: string;
  body: string;
  eventId?: string;
  kind?: ChatMessageKind;
  topic?: TeamChatMessage["topic"];
  pinned?: boolean;
}): Promise<TeamChatMutationResult> {
  const body = input.body.trim();
  if (!body) return { ok: false, message: "Write a message before sending." };

  const access = await actorCanPost(input.teamId, input.authorUserId);
  if (!access) return { ok: false, message: "Team Chat is private to assigned parents, assigned coaches, and org admins." };
  if (input.kind === "announcement" && !access.canModerate) {
    return { ok: false, message: "Only assigned coaches and org admins can post Coach Notes." };
  }

  const { data: channel } = await access.supabase
    .from("team_chat_channels")
    .upsert({
      organization_id: access.team.organization_id,
      season_id: access.team.season_id,
      team_id: access.team.id
    }, { onConflict: "team_id" })
    .select("id")
    .single();
  if (!channel) return { ok: false, message: "Team Chat channel could not be prepared." };

  const { data, error } = await withSupabaseTimeout(access.supabase
    .from("team_chat_messages")
    .insert({
      organization_id: access.team.organization_id,
      season_id: access.team.season_id,
      team_id: access.team.id,
      channel_id: channel.id,
      event_id: input.eventId || null,
      author_user_id: input.authorUserId,
      author_role: access.actor.default_role,
      message_kind: input.kind ?? "message",
      announcement_topic: input.topic ?? null,
      body,
      pinned: Boolean(input.pinned),
      read_by_user_ids: [input.authorUserId]
    })
    .select("id,organization_id,season_id,team_id,channel_id,event_id,author_user_id,author_role,message_kind,announcement_topic,body,pinned,moderation_status,read_by_user_ids,created_at,edited_at,deleted_at,moderated_at,moderated_by_user_id,moderation_reason")
    .single(), 7000);

  if (error || !data) return { ok: false, message: "Team Chat message could not be saved." };

  if (input.pinned) {
    await access.supabase.from("team_chat_channels").update({ pinned_message_id: data.id }).eq("id", channel.id);
  }

  return { ok: true, message: input.kind === "announcement" ? "Coach Note saved to Supabase." : "Team Chat message saved to Supabase.", createdMessage: mapTeamChatMessageRow(data) };
}

export async function moderateSupabaseTeamChatMessage(input: {
  messageId: string;
  actorUserId: string;
  action: ChatModerationAction;
  reason: string;
}): Promise<TeamChatMutationResult> {
  const reason = input.reason.trim();
  if (!reason) return { ok: false, message: "A moderation reason is required." };

  const supabase = createSupabaseAdminClient();
  const { data: message } = await supabase.from("team_chat_messages").select("id,organization_id,team_id,channel_id").eq("id", input.messageId).single();
  if (!message) return { ok: false, message: "Moderation requires a known message." };

  const access = await actorCanPost(message.team_id, input.actorUserId);
  if (!access?.canModerate) return { ok: false, message: "Only assigned coaches and org admins can moderate Team Chat messages." };

  const nextStatus = input.action === "message_restored" ? "visible" : input.action === "message_deleted" ? "deleted" : "hidden";
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("team_chat_messages")
    .update({
      moderation_status: nextStatus,
      deleted_at: nextStatus === "deleted" ? now : null,
      moderated_at: now,
      moderated_by_user_id: input.actorUserId,
      moderation_reason: reason
    })
    .eq("id", input.messageId)
    .select("id,organization_id,season_id,team_id,channel_id,event_id,author_user_id,author_role,message_kind,announcement_topic,body,pinned,moderation_status,read_by_user_ids,created_at,edited_at,deleted_at,moderated_at,moderated_by_user_id,moderation_reason")
    .single();

  if (error || !data) return { ok: false, message: "Team Chat moderation could not be saved." };

  await supabase.from("chat_moderation_audit_events").insert({
    message_id: message.id,
    channel_id: message.channel_id,
    team_id: message.team_id,
    actor_user_id: input.actorUserId,
    actor_role: access.actor.default_role,
    action: input.action,
    reason
  });

  return { ok: true, message: "Team Chat moderation saved to Supabase.", moderatedMessage: mapTeamChatMessageRow(data) };
}

export async function markSupabaseTeamChatRead(input: {
  messageIds: string[];
  userId: string;
}): Promise<{ ok: boolean; message: string }> {
  if (!input.userId || !input.messageIds.length) return { ok: false, message: "Read receipt requires a user and messages." };
  const supabase = createSupabaseAdminClient();
  const rows = input.messageIds.map((messageId) => ({ message_id: messageId, user_id: input.userId }));
  await supabase.from("team_chat_message_reads").upsert(rows, { onConflict: "message_id,user_id" });
  for (const messageId of input.messageIds) {
    const { data: message } = await supabase.from("team_chat_messages").select("read_by_user_ids").eq("id", messageId).single();
    const readBy = Array.from(new Set([...(message?.read_by_user_ids ?? []), input.userId]));
    await supabase.from("team_chat_messages").update({ read_by_user_ids: readBy }).eq("id", messageId);
  }
  return { ok: true, message: "Read receipts saved to Supabase." };
}
