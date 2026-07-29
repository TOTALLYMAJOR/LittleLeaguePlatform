import { seedState, type ChatModerationAction, type ChatModerationAuditEvent, type ChatMessageKind, type LeagueEvent, type Team, type TeamChatChannel, type TeamChatMessage, type TeamMembership, type User, type UserRole } from "@/lib/domain";
import { createSupabaseAdminClient } from "./admin";
import { orderCurrentTeamsFirst, type TeamLifecycleRow } from "./team-lifecycle";
import { withSupabaseTimeout } from "./timeout";

export interface TeamChatData {
  teams: Team[];
  users: User[];
  teamMemberships: TeamMembership[];
  events: LeagueEvent[];
  channels: TeamChatChannel[];
  messages: TeamChatMessage[];
  moderationEvents: ChatModerationAuditEvent[];
  reports?: TeamChatReport[];
  isSupabaseBacked?: boolean;
  message?: string;
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
  reported_count?: number;
};

export type TeamChatReportStatus = "open" | "reviewed" | "dismissed" | "action_taken";

export interface TeamChatReport {
  id: string;
  messageId: string;
  teamId: string;
  reporterUserId: string;
  reason: string;
  status: TeamChatReportStatus;
  reviewedByUserId?: string;
  reviewedAt?: string;
  createdAt: string;
}

type ReportRow = {
  id: string;
  message_id: string;
  team_id: string;
  reporter_user_id: string;
  reason: string;
  status: TeamChatReportStatus;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type TeamChatTeamRow = TeamLifecycleRow & {
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
};

type ProfileRow = {
  id: string;
  default_role: UserRole;
  display_name: string;
  email: string;
  phone: string | null;
};

type TeamMembershipRow = {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMembership["role"];
  status: TeamMembership["status"];
};

type EventRow = {
  id: string;
  organization_id: string;
  team_id: string;
  season_id: string;
  title: string;
  event_type: LeagueEvent["eventType"];
  starts_at: string;
  ends_at: string;
  location_name: string | null;
  location_address: string | null;
  status: LeagueEvent["status"];
  opponent: string | null;
  created_at: string;
  updated_at: string;
};

type ChannelRow = {
  id: string;
  organization_id: string;
  season_id: string;
  team_id: string;
  pinned_message_id: string | null;
  created_at: string;
  updated_at: string;
};

type ModerationRow = {
  id: string;
  message_id: string;
  channel_id: string;
  team_id: string;
  actor_user_id: string;
  actor_role: UserRole;
  action: ChatModerationAction;
  reason: string;
  created_at: string;
};

type UnsafeSupabase = {
  // Team lifecycle and report columns can lead the generated database types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

function mapTeam(row: TeamChatTeamRow): Team {
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
    moderationReason: row.moderation_reason ?? undefined,
    reportedCount: row.reported_count ?? 0
  };
}

function mapTeamChatReportRow(row: ReportRow): TeamChatReport {
  return {
    id: row.id,
    messageId: row.message_id,
    teamId: row.team_id,
    reporterUserId: row.reporter_user_id,
    reason: row.reason,
    status: row.status,
    reviewedByUserId: row.reviewed_by_user_id ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    createdAt: row.created_at
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
    moderationEvents: seedState.chatModerationAuditEvents,
    reports: [],
    isSupabaseBacked: false,
    message: "Current team conversation could not be reached. Preview data is read-only."
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
  const { data: adminMemberships } = await withSupabaseTimeout(supabase
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", team.organization_id)
    .eq("user_id", actorUserId)
    .eq("role", "admin")
    .eq("status", "active"), 7000);
  const isAdmin = Boolean(adminMemberships?.length);
  if (!isMember && !isAdmin) return null;
  const actorRole = isAdmin
    ? "admin"
    : membership?.find((item) => item.role === "coach")?.role ?? membership?.[0]?.role ?? actor.default_role;
  return {
    supabase,
    actor: { ...actor, default_role: actorRole },
    team,
    memberships: membership ?? [],
    canModerate: actorRole === "admin" || actorRole === "coach"
  };
}

export async function listTeamChatData(): Promise<TeamChatData> {
  try {
    const supabase = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const [teamsResult, profilesResult, membershipsResult, eventsResult] = await withSupabaseTimeout(Promise.all([
      supabase.from("teams").select("id,organization_id,season_id,division,name,coach_user_id,mascot,primary_color,secondary_color,theme_key,status,seasons(status)").order("division", { ascending: true }).order("name", { ascending: true }),
      supabase.from("profiles").select("id,display_name,email,phone,default_role").order("display_name", { ascending: true }),
      supabase.from("team_memberships").select("id,team_id,user_id,role,status").order("created_at", { ascending: false }),
      supabase.from("events").select("id,organization_id,team_id,season_id,title,event_type,starts_at,ends_at,location_name,location_address,status,opponent,created_at,updated_at").order("starts_at", { ascending: true })
    ]), 7000);

    if (teamsResult.error || profilesResult.error || membershipsResult.error || eventsResult.error || !teamsResult.data?.length) {
      return fallbackChatData();
    }

    const teams = orderCurrentTeamsFirst((teamsResult.data ?? []) as TeamChatTeamRow[]).map(mapTeam);
    await withSupabaseTimeout(Promise.all(teams.map((team) => supabase
      .from("team_chat_channels")
      .upsert({
        organization_id: team.organizationId,
        season_id: team.seasonId,
        team_id: team.id
      }, { onConflict: "team_id" }))), 7000);

    const [channelsResult, messagesResult, moderationResult, reportsResult] = await withSupabaseTimeout(Promise.all([
      supabase.from("team_chat_channels").select("id,organization_id,season_id,team_id,pinned_message_id,created_at,updated_at").order("created_at", { ascending: true }),
      supabase.from("team_chat_messages").select("id,organization_id,season_id,team_id,channel_id,event_id,author_user_id,author_role,message_kind,announcement_topic,body,pinned,moderation_status,read_by_user_ids,created_at,edited_at,deleted_at,moderated_at,moderated_by_user_id,moderation_reason,reported_count").order("created_at", { ascending: true }).limit(200),
      supabase.from("chat_moderation_audit_events").select("id,message_id,channel_id,team_id,actor_user_id,actor_role,action,reason,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("team_chat_reports").select("id,message_id,team_id,reporter_user_id,reason,status,reviewed_by_user_id,reviewed_at,created_at").order("created_at", { ascending: false }).limit(100)
    ]), 7000);

    if (channelsResult.error || messagesResult.error || moderationResult.error || reportsResult.error) {
      return fallbackChatData();
    }

    return {
      teams,
      users: ((profilesResult.data ?? []) as ProfileRow[]).map((profile) => ({
        id: profile.id,
        role: profile.default_role,
        name: profile.display_name,
        email: profile.email,
        phone: profile.phone ?? undefined
      })),
      teamMemberships: ((membershipsResult.data ?? []) as TeamMembershipRow[]).map((membership) => ({
        id: membership.id,
        teamId: membership.team_id,
        userId: membership.user_id,
        role: membership.role,
        status: membership.status
      })),
      events: ((eventsResult.data ?? []) as EventRow[]).map((event) => ({
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
      channels: ((channelsResult.data ?? []) as ChannelRow[]).map((channel) => ({
        id: channel.id,
        organizationId: channel.organization_id,
        seasonId: channel.season_id,
        teamId: channel.team_id,
        pinnedMessageId: channel.pinned_message_id ?? undefined,
        createdAt: channel.created_at,
        updatedAt: channel.updated_at
      })),
      messages: (messagesResult.data ?? []).map(mapTeamChatMessageRow),
      moderationEvents: ((moderationResult.data ?? []) as ModerationRow[]).map((event) => ({
        id: event.id,
        messageId: event.message_id,
        channelId: event.channel_id,
        teamId: event.team_id,
        actorUserId: event.actor_user_id,
        actorRole: event.actor_role,
        action: event.action,
        reason: event.reason,
        createdAt: event.created_at
      })),
      reports: (reportsResult.data ?? []).map(mapTeamChatReportRow),
      isSupabaseBacked: true,
      message: "Current team conversation loaded for the signed-in team scope."
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
      reported_count: 0,
      read_by_user_ids: [input.authorUserId]
    })
    .select("id,organization_id,season_id,team_id,channel_id,event_id,author_user_id,author_role,message_kind,announcement_topic,body,pinned,moderation_status,read_by_user_ids,created_at,edited_at,deleted_at,moderated_at,moderated_by_user_id,moderation_reason,reported_count")
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
    .select("id,organization_id,season_id,team_id,channel_id,event_id,author_user_id,author_role,message_kind,announcement_topic,body,pinned,moderation_status,read_by_user_ids,created_at,edited_at,deleted_at,moderated_at,moderated_by_user_id,moderation_reason,reported_count")
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

export async function reportSupabaseTeamChatMessage(input: {
  messageId: string;
  reporterUserId: string;
  reason: string;
}): Promise<{ ok: boolean; message: string; report?: TeamChatReport; reportedMessage?: TeamChatMessage }> {
  const reason = input.reason.trim();
  if (!input.messageId || !input.reporterUserId || !reason) {
    return { ok: false, message: "Team Chat report requires message, reporter, and reason." };
  }

  const supabase = createSupabaseAdminClient();
  const { data: message } = await supabase
    .from("team_chat_messages")
    .select("id,organization_id,season_id,team_id,channel_id,event_id,author_user_id,author_role,message_kind,announcement_topic,body,pinned,moderation_status,read_by_user_ids,created_at,edited_at,deleted_at,moderated_at,moderated_by_user_id,moderation_reason,reported_count")
    .eq("id", input.messageId)
    .single();
  if (!message) return { ok: false, message: "Team Chat report requires a known message." };

  const access = await actorCanPost(message.team_id, input.reporterUserId);
  if (!access) return { ok: false, message: "Only assigned team members can report Team Chat messages." };

  const { data: existingReport } = await supabase
    .from("team_chat_reports")
    .select("id,message_id,team_id,reporter_user_id,reason,status,reviewed_by_user_id,reviewed_at,created_at")
    .eq("message_id", input.messageId)
    .eq("reporter_user_id", input.reporterUserId)
    .single();
  if (existingReport) {
    return {
      ok: true,
      message: "Team Chat message was already reported by this user.",
      report: mapTeamChatReportRow(existingReport),
      reportedMessage: mapTeamChatMessageRow(message)
    };
  }

  const { data: report, error } = await supabase
    .from("team_chat_reports")
    .insert({
      message_id: input.messageId,
      team_id: message.team_id,
      reporter_user_id: input.reporterUserId,
      reason,
      status: "open"
    })
    .select("id,message_id,team_id,reporter_user_id,reason,status,reviewed_by_user_id,reviewed_at,created_at")
    .single();
  if (error || !report) return { ok: false, message: "Team Chat report could not be saved." };

  const nextReportedCount = (message.reported_count ?? 0) + 1;
  const { data: updatedMessage } = await supabase
    .from("team_chat_messages")
    .update({ reported_count: nextReportedCount })
    .eq("id", input.messageId)
    .select("id,organization_id,season_id,team_id,channel_id,event_id,author_user_id,author_role,message_kind,announcement_topic,body,pinned,moderation_status,read_by_user_ids,created_at,edited_at,deleted_at,moderated_at,moderated_by_user_id,moderation_reason,reported_count")
    .single();

  await supabase.from("audit_events").insert({
    organization_id: message.organization_id,
    actor_user_id: input.reporterUserId,
    action: "team_chat_message_reported",
    target_type: "team_chat_message",
    target_id: input.messageId,
    summary: reason
  });

  return {
    ok: true,
    message: "Team Chat message reported for coach/admin review.",
    report: mapTeamChatReportRow(report),
    reportedMessage: updatedMessage ? mapTeamChatMessageRow(updatedMessage) : mapTeamChatMessageRow({ ...message, reported_count: nextReportedCount })
  };
}

export async function reviewSupabaseTeamChatReport(input: {
  reportId: string;
  reviewerUserId: string;
  status: Exclude<TeamChatReportStatus, "open">;
  reason: string;
}): Promise<{ ok: boolean; message: string; report?: TeamChatReport }> {
  const reason = input.reason.trim();
  if (!input.reportId || !input.reviewerUserId || !reason) {
    return { ok: false, message: "Team Chat report review requires report, reviewer, and reason." };
  }
  if (!["reviewed", "dismissed", "action_taken"].includes(input.status)) {
    return { ok: false, message: "Unsupported Team Chat report review status." };
  }

  const supabase = createSupabaseAdminClient();
  const { data: report } = await supabase
    .from("team_chat_reports")
    .select("id,message_id,team_id,reporter_user_id,reason,status,reviewed_by_user_id,reviewed_at,created_at")
    .eq("id", input.reportId)
    .single();
  if (!report) return { ok: false, message: "Team Chat report could not be found." };

  const access = await actorCanPost(report.team_id, input.reviewerUserId);
  if (!access?.canModerate) return { ok: false, message: "Only assigned coaches and org admins can review Team Chat reports." };

  const reviewedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("team_chat_reports")
    .update({
      status: input.status,
      reviewed_by_user_id: input.reviewerUserId,
      reviewed_at: reviewedAt
    })
    .eq("id", input.reportId)
    .select("id,message_id,team_id,reporter_user_id,reason,status,reviewed_by_user_id,reviewed_at,created_at")
    .single();
  if (error || !data) return { ok: false, message: "Team Chat report review could not be saved." };

  await supabase.from("audit_events").insert({
    organization_id: access.team.organization_id,
    actor_user_id: input.reviewerUserId,
    action: "team_chat_report_reviewed",
    target_type: "team_chat_report",
    target_id: input.reportId,
    summary: `${input.status}: ${reason}`
  });

  return { ok: true, message: "Team Chat report review saved.", report: mapTeamChatReportRow(data) };
}

export async function runSupabaseTeamChatRetentionJob(input: {
  teamId: string;
  actorUserId: string;
  retentionCutoff?: string;
}): Promise<{ ok: boolean; message: string; purgedCount?: number }> {
  if (!input.teamId || !input.actorUserId) return { ok: false, message: "Team Chat retention requires team and actor." };

  const access = await actorCanPost(input.teamId, input.actorUserId);
  if (!access?.canModerate) return { ok: false, message: "Only assigned coaches and org admins can run Team Chat retention." };

  const cutoff = input.retentionCutoff ?? new Date().toISOString();
  const { data, error } = await withSupabaseTimeout((access.supabase as unknown as {
    rpc(name: string, args: { p_team_id: string; p_retention_cutoff: string }): PromiseLike<{ data: number | null; error: { message?: string } | null }>;
  }).rpc("purge_expired_team_chat_messages_for_team", {
    p_team_id: input.teamId,
    p_retention_cutoff: cutoff
  }), 7000);
  if (error) return { ok: false, message: "Team Chat retention job could not run." };

  const purgedCount = data ?? 0;
  await access.supabase.from("audit_events").insert({
    organization_id: access.team.organization_id,
    actor_user_id: input.actorUserId,
    action: "team_chat_retention_run",
    target_type: "team",
    target_id: input.teamId,
    summary: `Team Chat retention ran for cutoff ${cutoff}; ${purgedCount} message(s) purged.`
  });

  return {
    ok: true,
    message: purgedCount
      ? `Team Chat retention purged ${purgedCount} expired message(s).`
      : "Team Chat retention ran; no expired messages required deletion.",
    purgedCount
  };
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
