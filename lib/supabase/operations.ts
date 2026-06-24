import type { ParentReplayDraft, ParentReplayRecord, PracticeFocusArea } from "@/lib/domain";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Tables introduced by staged migrations are intentionally accessed through
  // a narrow dynamic boundary until the generated Supabase types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

interface DynamicQueryResult<T = unknown> {
  data: T | null;
  error: { message?: string } | null;
}

function adminDb() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

function runDynamicQuery<T>(operation: PromiseLike<unknown>, milliseconds = 7000) {
  return withSupabaseTimeout(operation as PromiseLike<DynamicQueryResult<T>>, milliseconds);
}

function googleMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function googleMapsEmbedUrl(address: string) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(address)}`;
}

export async function upsertFieldLocation(input: {
  organizationId: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
}) {
  const name = input.name.trim();
  const address = input.address.trim();
  if (!input.organizationId || !name || !address) {
    return { ok: false, message: "Field location requires organization, name, and address." };
  }

  try {
    const db = adminDb();
    const { data, error } = await runDynamicQuery(db
      .from("field_locations")
      .upsert({
        organization_id: input.organizationId,
        name,
        address,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        google_place_id: input.googlePlaceId ?? null,
        map_url: googleMapsUrl(address),
        map_embed_url: googleMapsEmbedUrl(address),
        status: "active"
      }, { onConflict: "organization_id,name" })
      .select("id,name,address,map_url,map_embed_url,status")
      .single());

    if (error || !data) return { ok: false, message: "Field location could not be saved." };
    return { ok: true, message: "Field location saved with Google Maps metadata.", fieldLocation: data };
  } catch {
    return { ok: false, message: "Field location could not reach Supabase." };
  }
}

export async function registerPushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  authSecret: string;
  userAgent?: string;
}) {
  if (!input.userId || !input.endpoint || !input.p256dh || !input.authSecret) {
    return { ok: false, message: "Push subscription requires user, endpoint, and browser keys." };
  }

  try {
    const db = adminDb();
    const { data, error } = await runDynamicQuery(db
      .from("push_subscriptions")
      .upsert({
        user_id: input.userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth_secret: input.authSecret,
        user_agent: input.userAgent ?? null,
        enabled: true
      }, { onConflict: "user_id,endpoint" })
      .select("id,user_id,enabled,updated_at")
      .single());

    if (error || !data) return { ok: false, message: "Push subscription could not be saved." };
    return { ok: true, message: "Push subscription saved. No push send occurs without opt-in and provider approval.", subscription: data };
  } catch {
    return { ok: false, message: "Push subscription could not reach Supabase." };
  }
}

export async function updateNotificationPreference(input: {
  userId: string;
  organizationId?: string;
  teamId?: string;
  channel: "push" | "email" | "sms";
  notificationType: "schedule_changed" | "event_cancelled" | "new_event" | "invite_sent" | "invite_recovered" | "parent_replay_ready" | "team_broadcast" | "weather_alert" | "chat_announcement" | "volunteer_reminder" | "snack_reminder";
  enabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}) {
  if (!input.userId || !input.channel || !input.notificationType || (!input.organizationId && !input.teamId)) {
    return { ok: false, message: "Notification preference requires user, scope, channel, and type." };
  }

  try {
    const db = adminDb();
    let deleteQuery = db
      .from("notification_preferences")
      .delete()
      .eq("user_id", input.userId)
      .eq("channel", input.channel)
      .eq("notification_type", input.notificationType);

    deleteQuery = input.organizationId ? deleteQuery.eq("organization_id", input.organizationId) : deleteQuery.is("organization_id", null);
    deleteQuery = input.teamId ? deleteQuery.eq("team_id", input.teamId) : deleteQuery.is("team_id", null);

    const deleteResult = await runDynamicQuery(deleteQuery);
    if (deleteResult.error) return { ok: false, message: "Existing notification preference could not be replaced." };

    const now = new Date().toISOString();
    const { data, error } = await runDynamicQuery(db
      .from("notification_preferences")
      .insert({
        user_id: input.userId,
        organization_id: input.organizationId ?? null,
        team_id: input.teamId ?? null,
        channel: input.channel,
        notification_type: input.notificationType,
        enabled: input.enabled,
        quiet_hours_start: input.quietHoursStart ?? null,
        quiet_hours_end: input.quietHoursEnd ?? null,
        timezone: input.timezone ?? "America/Chicago",
        opted_in_at: input.enabled ? now : null,
        opted_out_at: input.enabled ? null : now
      })
      .select("id,user_id,team_id,channel,notification_type,enabled,quiet_hours_start,quiet_hours_end,timezone,opted_in_at,opted_out_at")
      .single());

    if (error || !data) return { ok: false, message: "Notification preference could not be saved." };
    return { ok: true, message: "Notification preference saved to Supabase.", preference: data };
  } catch {
    return { ok: false, message: "Notification preference could not reach Supabase." };
  }
}

export async function saveCoachWeeklyUpdate(input: {
  teamId: string;
  coachUserId: string;
  title: string;
  body: string;
}) {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!input.teamId || !input.coachUserId || !title || !body) {
    return { ok: false, message: "Weekly update requires team, coach, title, and body." };
  }

  try {
    const db = adminDb();
    const { data: team, error: teamError } = await runDynamicQuery<{
      id: string;
      organization_id: string;
    }>(db
      .from("teams")
      .select("id,organization_id")
      .eq("id", input.teamId)
      .single());

    if (teamError || !team) return { ok: false, message: "Weekly update requires a known team." };

    const [{ data: coachMemberships }, { data: adminMemberships }] = await Promise.all([
      runDynamicQuery<Array<{ id: string }>>(db
        .from("team_memberships")
        .select("id")
        .eq("team_id", input.teamId)
        .eq("user_id", input.coachUserId)
        .eq("role", "coach")
        .eq("status", "active")),
      runDynamicQuery<Array<{ id: string }>>(db
        .from("organization_memberships")
        .select("id")
        .eq("organization_id", team.organization_id)
        .eq("user_id", input.coachUserId)
        .eq("role", "admin")
        .eq("status", "active"))
    ]);

    if (!coachMemberships?.length && !adminMemberships?.length) {
      return { ok: false, message: "Only assigned coaches or org admins can save weekly updates." };
    }

    const { data: announcement, error: announcementError } = await runDynamicQuery(db
      .from("announcements")
      .insert({
        team_id: input.teamId,
        author_user_id: input.coachUserId,
        title,
        body
      })
      .select("id,team_id,title,body,created_at")
      .single());

    if (announcementError || !announcement) return { ok: false, message: "Weekly update announcement could not be saved." };

    const { data: guardianRows } = await runDynamicQuery<Array<{ parent_user_id: string | null }>>(db
      .from("player_guardians")
      .select("parent_user_id,players!inner(team_id)")
      .eq("status", "active")
      .eq("players.team_id", input.teamId)
      .not("parent_user_id", "is", null));

    const recipientIds = Array.from(new Set((guardianRows ?? []).map((row) => row.parent_user_id).filter(Boolean))) as string[];
    const notificationRows = recipientIds.map((recipientUserId) => ({
      organization_id: team.organization_id,
      recipient_user_id: recipientUserId,
      team_id: input.teamId,
      notification_type: "team_broadcast",
      title,
      body,
      channel: "email",
      status: "pending"
    }));

    const notificationsResult = notificationRows.length
      ? await runDynamicQuery(db.from("notifications").insert(notificationRows).select("id"))
      : { data: [], error: null };

    if (notificationsResult.error) {
      return { ok: false, message: "Weekly update saved, but notification drafts could not be queued.", announcement };
    }

    return {
      ok: true,
      message: `Weekly update saved with ${notificationRows.length} pending email draft(s). No provider send occurred.`,
      announcement,
      notificationCount: notificationRows.length
    };
  } catch {
    return { ok: false, message: "Weekly update could not reach Supabase." };
  }
}

export async function saveParentReplay(input: {
  teamId: string;
  actorUserId: string;
  focusAreas: PracticeFocusArea[];
  draft: ParentReplayDraft;
}) {
  if (!input.teamId || !input.actorUserId || input.focusAreas.length < 2 || input.focusAreas.length > 3) {
    return { ok: false, message: "Parent Replay requires a team, coach approval, and 2-3 focus areas." };
  }

  try {
    const db = adminDb();
    const { data: team, error: teamError } = await runDynamicQuery<{
      id: string;
      organization_id: string;
      season_id: string;
      name: string;
    }>(db
      .from("teams")
      .select("id,organization_id,season_id,name")
      .eq("id", input.teamId)
      .single());

    if (teamError || !team) return { ok: false, message: "Parent Replay requires a known team." };

    const [{ data: coachMemberships }, { data: adminMemberships }] = await Promise.all([
      runDynamicQuery<Array<{ id: string }>>(db
        .from("team_memberships")
        .select("id")
        .eq("team_id", input.teamId)
        .eq("user_id", input.actorUserId)
        .eq("role", "coach")
        .eq("status", "active")),
      runDynamicQuery<Array<{ id: string }>>(db
        .from("organization_memberships")
        .select("id")
        .eq("organization_id", team.organization_id)
        .eq("user_id", input.actorUserId)
        .eq("role", "admin")
        .eq("status", "active"))
    ]);

    if (!coachMemberships?.length && !adminMemberships?.length) {
      return { ok: false, message: "Only assigned coaches or org admins can publish Parent Replay." };
    }

    const now = new Date().toISOString();
    const { data: replay, error: replayError } = await runDynamicQuery<{
      id: string;
      organization_id: string;
      season_id: string;
      team_id: string;
      coach_user_id: string;
      focus_areas: PracticeFocusArea[];
      title: string;
      summary: string;
      home_activities: ParentReplayDraft["homeActivities"];
      coach_video: ParentReplayDraft["coachVideo"];
      parent_tip: string;
      team_quest: string;
      skill_cards: string[];
      parent_education: string;
      status: ParentReplayRecord["status"];
      generated_at: string;
      created_at: string;
    }>(db
      .from("parent_replays")
      .insert({
        organization_id: team.organization_id,
        season_id: team.season_id,
        team_id: input.teamId,
        coach_user_id: input.actorUserId,
        focus_areas: input.focusAreas,
        title: input.draft.title,
        summary: input.draft.summary,
        home_activities: input.draft.homeActivities,
        coach_video: input.draft.coachVideo,
        parent_tip: input.draft.parentTip,
        team_quest: input.draft.teamQuest,
        skill_cards: input.draft.skillCards,
        parent_education: input.draft.parentEducation,
        status: "queued",
        generation_source: "deterministic",
        reviewed_by_user_id: input.actorUserId,
        reviewed_at: now,
        published_at: now,
        generated_at: input.draft.generatedAt
      })
      .select("id,organization_id,season_id,team_id,coach_user_id,focus_areas,title,summary,home_activities,coach_video,parent_tip,team_quest,skill_cards,parent_education,status,generated_at,created_at")
      .single());

    if (replayError || !replay) return { ok: false, message: "Parent Replay could not be saved." };

    const { data: guardianRows } = await runDynamicQuery<Array<{ parent_user_id: string | null }>>(db
      .from("player_guardians")
      .select("parent_user_id,players!inner(team_id)")
      .eq("status", "active")
      .eq("players.team_id", input.teamId)
      .not("parent_user_id", "is", null));

    const recipientIds = Array.from(new Set((guardianRows ?? []).map((row) => row.parent_user_id).filter(Boolean))) as string[];
    const notificationRows = recipientIds.map((recipientUserId) => ({
      organization_id: team.organization_id,
      recipient_user_id: recipientUserId,
      team_id: input.teamId,
      notification_type: "parent_replay_ready",
      title: "Parent Replay is ready",
      body: `${team.name} has a coach-approved Parent Replay ready for families.`,
      channel: "email",
      status: "pending"
    }));

    const notificationsResult = notificationRows.length
      ? await runDynamicQuery(db.from("notifications").insert(notificationRows).select("id"))
      : { data: [], error: null };

    await runDynamicQuery(db
      .from("audit_events")
      .insert({
        organization_id: team.organization_id,
        actor_user_id: input.actorUserId,
        action: "parent_replay_published",
        target_type: "parent_replay",
        target_id: replay.id,
        summary: `Parent Replay published for ${team.name} with ${input.focusAreas.length} focus areas.`
      }));

    const parentReplay: ParentReplayRecord = {
      id: replay.id,
      organizationId: replay.organization_id,
      seasonId: replay.season_id,
      teamId: replay.team_id,
      coachUserId: replay.coach_user_id,
      focusAreas: replay.focus_areas,
      title: replay.title,
      summary: replay.summary,
      homeActivities: replay.home_activities,
      parentTranslations: input.draft.parentTranslations,
      microCoachingStreak: input.draft.microCoachingStreak,
      memoryMoment: input.draft.memoryMoment,
      coachVideo: replay.coach_video,
      parentTip: replay.parent_tip,
      teamQuest: replay.team_quest,
      skillCards: replay.skill_cards,
      parentEducation: replay.parent_education,
      generatedAt: replay.generated_at,
      status: replay.status,
      createdAt: replay.created_at
    };

    if (notificationsResult.error) {
      return {
        ok: true,
        message: "Parent Replay saved, but notification drafts could not be queued.",
        parentReplay,
        notificationCount: 0
      };
    }

    return {
      ok: true,
      message: `Parent Replay saved with ${notificationRows.length} pending parent notification draft(s). No provider send occurred.`,
      parentReplay,
      notificationCount: notificationRows.length
    };
  } catch {
    return { ok: false, message: "Parent Replay could not reach Supabase." };
  }
}

export async function updateParentRsvp(input: {
  eventId: string;
  playerId: string;
  parentUserId: string;
  response: "going" | "not_going" | "maybe";
  note?: string;
}) {
  if (!input.eventId || !input.playerId || !input.parentUserId) {
    return { ok: false, message: "RSVP requires event, player, and parent." };
  }
  try {
    const db = adminDb();
    const { data, error } = await runDynamicQuery(db
      .from("rsvps")
      .upsert({
        event_id: input.eventId,
        player_id: input.playerId,
        parent_user_id: input.parentUserId,
        response: input.response,
        note: input.note ?? null,
        responded_at: new Date().toISOString()
      }, { onConflict: "event_id,player_id" })
      .select("id,event_id,player_id,parent_user_id,response,note,responded_at")
      .single());
    if (error || !data) return { ok: false, message: "RSVP could not be saved." };
    return { ok: true, message: "RSVP saved to Supabase.", rsvp: data };
  } catch {
    return { ok: false, message: "RSVP could not reach Supabase." };
  }
}

export async function claimSnackSlot(input: {
  slotId: string;
  parentUserId: string;
}) {
  if (!input.slotId || !input.parentUserId) return { ok: false, message: "Snack signup requires a slot and parent." };
  try {
    const db = adminDb();
    const { data, error } = await runDynamicQuery(db
      .from("snack_schedule_slots")
      .update({ assigned_parent_user_id: input.parentUserId, status: "assigned" })
      .eq("id", input.slotId)
      .select("id,status,assigned_parent_user_id")
      .single());
    if (error || !data) return { ok: false, message: "Snack slot could not be assigned." };
    return { ok: true, message: "Snack slot saved to Supabase.", slot: data };
  } catch {
    return { ok: false, message: "Snack slot could not reach Supabase." };
  }
}

export async function claimVolunteerRole(input: {
  signupId: string;
  userId: string;
}) {
  if (!input.signupId || !input.userId) return { ok: false, message: "Volunteer signup requires a role and user." };
  try {
    const db = adminDb();
    const { data, error } = await runDynamicQuery(db
      .from("volunteer_signups")
      .update({ assigned_user_id: input.userId, status: "filled" })
      .eq("id", input.signupId)
      .select("id,status,assigned_user_id")
      .single());
    if (error || !data) return { ok: false, message: "Volunteer role could not be assigned." };
    return { ok: true, message: "Volunteer role saved to Supabase.", signup: data };
  } catch {
    return { ok: false, message: "Volunteer role could not reach Supabase." };
  }
}

export async function moderateMediaItem(input: {
  mediaItemId: string;
  reviewerUserId: string;
  status: "approved" | "hidden" | "rejected" | "removed";
  visibility?: "team" | "organization";
  reason?: string;
}) {
  if (!input.mediaItemId || !input.reviewerUserId) return { ok: false, message: "Media moderation requires an item and reviewer." };
  const reason = input.reason?.trim();
  try {
    const db = adminDb();
    const { data: mediaItem, error: mediaError } = await runDynamicQuery<{
      id: string;
      organization_id: string;
      team_id: string;
      title: string;
    }>(db
      .from("media_items")
      .select("id,organization_id,team_id,title")
      .eq("id", input.mediaItemId)
      .single());

    if (mediaError || !mediaItem) return { ok: false, message: "Media item could not be found." };

    const [{ data: teamMemberships }, { data: adminMemberships }] = await Promise.all([
      runDynamicQuery<Array<{ id: string }>>(db
        .from("team_memberships")
        .select("id")
        .eq("team_id", mediaItem.team_id)
        .eq("user_id", input.reviewerUserId)
        .in("role", ["coach", "admin"])
        .eq("status", "active")),
      runDynamicQuery<Array<{ id: string }>>(db
        .from("organization_memberships")
        .select("id")
        .eq("organization_id", mediaItem.organization_id)
        .eq("user_id", input.reviewerUserId)
        .eq("role", "admin")
        .eq("status", "active"))
    ]);

    if (!teamMemberships?.length && !adminMemberships?.length) {
      return { ok: false, message: "Only assigned coaches or org admins can moderate media." };
    }

    const now = new Date().toISOString();
    const updatePayload = {
      moderation_status: input.status,
      reviewed_by_user_id: input.reviewerUserId,
      reviewed_at: now,
      ...(input.visibility ? { visibility: input.visibility } : {}),
      ...(input.status === "hidden" ? { hidden_at: now, removed_at: null } : {}),
      ...(input.status === "removed" ? { removed_at: now } : {}),
      ...(input.status === "approved" ? { hidden_at: null, removed_at: null } : {})
    };

    const { data, error } = await runDynamicQuery(db
      .from("media_items")
      .update(updatePayload)
      .eq("id", input.mediaItemId)
      .select("id,title,moderation_status,visibility,reviewed_at")
      .single());
    if (error || !data) return { ok: false, message: "Media item could not be moderated. Make sure migration 0005 is applied." };

    await runDynamicQuery(db
      .from("audit_events")
      .insert({
        organization_id: mediaItem.organization_id,
        actor_user_id: input.reviewerUserId,
        action: `media_${input.status}`,
        target_type: "media_item",
        target_id: mediaItem.id,
        summary: reason
          ? `${mediaItem.title} set to ${input.status}: ${reason}`
          : `${mediaItem.title} set to ${input.status}.`
      }));

    return { ok: true, message: "Media moderation saved to Supabase.", mediaItem: data };
  } catch {
    return { ok: false, message: "Media moderation could not reach Supabase." };
  }
}

export async function reportMediaItem(input: {
  mediaItemId: string;
  reporterUserId: string;
  reason?: string;
}) {
  if (!input.mediaItemId || !input.reporterUserId) return { ok: false, message: "Media report requires an item and reporter." };

  try {
    const db = adminDb();
    const { data: mediaItem, error: mediaError } = await runDynamicQuery<{
      id: string;
      organization_id: string;
      team_id: string;
      report_count: number;
    }>(db
      .from("media_items")
      .select("id,organization_id,team_id,report_count")
      .eq("id", input.mediaItemId)
      .single());

    if (mediaError || !mediaItem) return { ok: false, message: "Media item could not be found." };

    const { data: team } = await runDynamicQuery<{ organization_id: string }>(db
      .from("teams")
      .select("organization_id")
      .eq("id", mediaItem.team_id)
      .single());

    const [{ data: teamMemberships }, { data: adminMemberships }] = await Promise.all([
      runDynamicQuery<Array<{ id: string }>>(db
        .from("team_memberships")
        .select("id")
        .eq("team_id", mediaItem.team_id)
        .eq("user_id", input.reporterUserId)
        .eq("status", "active")),
      runDynamicQuery<Array<{ id: string }>>(db
        .from("organization_memberships")
        .select("id")
        .eq("organization_id", team?.organization_id ?? "")
        .eq("user_id", input.reporterUserId)
        .eq("role", "admin")
        .eq("status", "active"))
    ]);

    if (!teamMemberships?.length && !adminMemberships?.length) {
      return { ok: false, message: "Only assigned team members can report team media." };
    }

    const { data, error } = await runDynamicQuery(db
      .from("media_items")
      .update({
        report_count: (mediaItem.report_count ?? 0) + 1,
        moderation_status: "pending"
      })
      .eq("id", input.mediaItemId)
      .select("id,title,moderation_status,report_count")
      .single());

    if (error || !data) return { ok: false, message: "Media report could not be saved." };

    await runDynamicQuery(db
      .from("audit_events")
      .insert({
        organization_id: mediaItem.organization_id,
        actor_user_id: input.reporterUserId,
        action: "media_reported",
        target_type: "media_item",
        target_id: mediaItem.id,
        summary: input.reason?.trim() || "Media reported for review."
      }));

    return { ok: true, message: "Media reported for review. It is now pending moderation.", mediaItem: data };
  } catch {
    return { ok: false, message: "Media report could not reach Supabase." };
  }
}

export async function saveSponsor(input: {
  organizationId: string;
  actorUserId: string;
  sponsorId?: string;
  name: string;
  level: "league" | "team";
  teamId?: string;
  url: string;
  status: "pending" | "active" | "expired";
  placementKey?: "team_portal" | "weekly_digest" | "storybook" | "registration" | "field_map";
  logoUrl?: string;
}) {
  const name = input.name.trim();
  const url = input.url.trim();
  const logoUrl = input.logoUrl?.trim();
  if (!input.organizationId || !input.actorUserId || !name || !url) {
    return { ok: false, message: "Sponsor requires organization, actor, name, and URL." };
  }
  if (input.level === "team" && !input.teamId) {
    return { ok: false, message: "Team sponsors require a team." };
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:") return { ok: false, message: "Sponsor URL must use HTTPS." };
    if (logoUrl) {
      const parsedLogoUrl = new URL(logoUrl);
      if (parsedLogoUrl.protocol !== "https:") return { ok: false, message: "Sponsor logo URL must use HTTPS." };
    }
  } catch {
    return { ok: false, message: "Sponsor URL fields must be valid URLs." };
  }

  try {
    const db = adminDb();
    const { data: adminRows } = await runDynamicQuery<Array<{ id: string }>>(db
      .from("organization_memberships")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("user_id", input.actorUserId)
      .eq("role", "admin")
      .eq("status", "active"));

    if (!adminRows?.length) return { ok: false, message: "Only active organization admins can manage sponsors." };

    const sponsorPayload = {
      organization_id: input.organizationId,
      name,
      level: input.level,
      team_id: input.level === "team" ? input.teamId : null,
      url,
      status: input.status,
      ...(input.sponsorId ? { id: input.sponsorId } : {})
    };

    const { data: sponsor, error } = await runDynamicQuery<{
      id: string;
      organization_id: string;
      name: string;
      level: "league" | "team";
      team_id: string | null;
      url: string;
      status: "pending" | "active" | "expired";
    }>(db
      .from("sponsors")
      .upsert(sponsorPayload)
      .select("id,organization_id,name,level,team_id,url,status")
      .single());

    if (error || !sponsor) return { ok: false, message: "Sponsor could not be saved." };

    if (input.placementKey) {
      await runDynamicQuery(db
        .from("sponsor_placements")
        .delete()
        .eq("sponsor_id", sponsor.id)
        .eq("placement_key", input.placementKey));
      await runDynamicQuery(db
        .from("sponsor_placements")
        .insert({
          sponsor_id: sponsor.id,
          organization_id: input.organizationId,
          team_id: input.level === "team" ? input.teamId : null,
          placement_key: input.placementKey,
          status: input.status === "expired" ? "expired" : "active"
        }));
    }

    if (logoUrl) {
      await runDynamicQuery(db
        .from("sponsor_assets")
        .insert({
          sponsor_id: sponsor.id,
          asset_type: "logo",
          url: logoUrl,
          status: "pending"
        }));
    }

    await runDynamicQuery(db
      .from("audit_events")
      .insert({
        organization_id: input.organizationId,
        actor_user_id: input.actorUserId,
        action: "sponsor_saved",
        target_type: "sponsor",
        target_id: sponsor.id,
        summary: `Sponsor ${name} saved with ${input.status} status and ${input.placementKey ?? "no"} placement.`
      }));

    return {
      ok: true,
      message: "Sponsor saved with admin audit event. Sponsor billing is still disconnected.",
      sponsor: {
        id: sponsor.id,
        organizationId: sponsor.organization_id,
        name: sponsor.name,
        level: sponsor.level,
        teamId: sponsor.team_id ?? undefined,
        url: sponsor.url,
        status: sponsor.status,
        placementKey: input.placementKey,
        logoUrl
      }
    };
  } catch {
    return { ok: false, message: "Sponsor could not reach Supabase." };
  }
}

export async function createWeatherAlertDraft(input: {
  eventId: string;
  reviewerUserId?: string;
}) {
  if (!input.eventId) return { ok: false, message: "Weather lookup requires an event." };
  const apiKey = process.env.TOMORROW_API_KEY || process.env.WEATHER_PROVIDER_API_KEY;
  if (!apiKey) return { ok: false, message: "TOMORROW_API_KEY is required before live weather lookup can run." };

  try {
    const db = adminDb();
    const { data: event } = await db
      .from("events")
      .select("id,organization_id,team_id,title,starts_at,location_name,location_address,latitude,longitude")
      .eq("id", input.eventId)
      .single();
    if (!event) return { ok: false, message: "Weather lookup requires a known event." };

    const location = event.latitude && event.longitude
      ? `${event.latitude},${event.longitude}`
      : event.location_address || event.location_name;
    if (!location) return { ok: false, message: "Weather lookup requires an event location." };

    const url = new URL("https://api.tomorrow.io/v4/weather/forecast");
    url.searchParams.set("location", location);
    url.searchParams.set("timesteps", "1h");
    url.searchParams.set("units", "imperial");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) return { ok: false, message: "Tomorrow.io weather lookup failed." };
    const payload = await response.json();
    const hourly = payload?.timelines?.hourly?.[0]?.values ?? {};
    const precipitation = Number(hourly.precipitationProbability ?? 0);
    const windSpeed = Number(hourly.windSpeed ?? 0);
    const temperature = Number(hourly.temperature ?? 0);
    const severity = precipitation >= 60 || windSpeed >= 25 ? "delay" : precipitation >= 35 || windSpeed >= 18 ? "watch" : "watch";
    const headline = precipitation >= 35 || windSpeed >= 18
      ? `Weather watch for ${event.title}`
      : `Weather checked for ${event.title}`;
    const detail = `Tomorrow.io forecast: ${Math.round(temperature)}F, ${Math.round(precipitation)}% precipitation chance, ${Math.round(windSpeed)} mph wind.`;

    const { data, error } = await db
      .from("weather_alerts")
      .insert({
        team_id: event.team_id,
        event_id: event.id,
        headline,
        detail,
        severity,
        status: "draft",
        provider: "tomorrow.io",
        provider_payload: payload,
        reviewed_by_user_id: input.reviewerUserId ?? null,
        reviewed_at: input.reviewerUserId ? new Date().toISOString() : null
      })
      .select("id,headline,detail,severity,status,provider,created_at")
      .single();

    if (error || !data) return { ok: false, message: "Weather alert draft could not be saved. Make sure migration 0005 is applied." };
    return { ok: true, message: "Tomorrow.io weather alert draft saved. No parent notification was sent.", alert: data };
  } catch {
    return { ok: false, message: "Weather lookup could not reach Tomorrow.io or Supabase." };
  }
}
