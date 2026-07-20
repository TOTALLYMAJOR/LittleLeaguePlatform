import { createHash } from "node:crypto";
import type { ParentReplayDraft, ParentReplayRecord, PracticeFocusArea } from "@/lib/domain";
import { featureGateDecision } from "@/lib/services/feature-gates";
import { getWeatherEventDraft } from "@/lib/services/weather";
import { requireActiveParentForPlayerEvent, requireActiveTeamCoachOrOrgAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Tables introduced by staged migrations are intentionally accessed through
  // a narrow dynamic boundary until the generated Supabase types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(name: string, input: Record<string, unknown>): any;
};

type MobileUsageEventType =
  | "install_prompt_shown"
  | "install_prompt_accepted"
  | "install_prompt_dismissed"
  | "standalone_launch"
  | "push_permission_requested"
  | "native_app_interest";

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

export async function listFieldLocations(organizationId?: string) {
  try {
    const db = adminDb();
    let query = db
      .from("field_locations")
      .select("id,organization_id,name,address,latitude,longitude,google_place_id,map_url,map_embed_url,status,updated_at")
      .order("name", { ascending: true });

    if (organizationId) query = query.eq("organization_id", organizationId);

    const { data, error } = await runDynamicQuery(query);
    if (error) return { ok: false, message: "Field locations could not be loaded.", fieldLocations: [] };

    return {
      ok: true,
      message: "Field locations loaded from Supabase with map fallback metadata.",
      fieldLocations: data ?? []
    };
  } catch {
    return { ok: false, message: "Field locations could not reach Supabase.", fieldLocations: [] };
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

export async function recordMobileUsageEvent(input: {
  eventType: MobileUsageEventType;
  routePath?: string;
  userAgent?: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  if (!input.eventType) return { ok: false, message: "Mobile usage event type is required." };

  try {
    const db = adminDb();
    const { data, error } = await runDynamicQuery(db
      .from("mobile_usage_events")
      .insert({
        event_type: input.eventType,
        route_path: input.routePath ?? null,
        user_agent: input.userAgent ?? null,
        metadata: input.metadata ?? {}
      })
      .select("id,event_type,created_at")
      .single());

    if (error || !data) return { ok: false, message: "Mobile usage event could not be recorded. Make sure migration 0010 is applied." };
    return { ok: true, message: "Mobile usage event recorded.", event: data };
  } catch {
    return { ok: false, message: "Mobile usage event could not reach Supabase." };
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
    const access = await requireActiveTeamCoachOrOrgAdmin({
      db,
      teamId: input.teamId,
      userId: input.coachUserId,
      action: "save weekly updates"
    });
    if (!access.ok || !access.team) return { ok: false, message: access.message };
    const team = access.team;

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
  practiceRunId?: string;
}) {
  if (!input.teamId || !input.actorUserId || input.focusAreas.length < 2 || input.focusAreas.length > 3) {
    return { ok: false, message: "Parent Replay requires a team, coach approval, and 2-3 focus areas." };
  }

  try {
    const db = adminDb();
    const access = await requireActiveTeamCoachOrOrgAdmin({
      db,
      teamId: input.teamId,
      userId: input.actorUserId,
      action: "save a Parent Replay draft"
    });
    if (!access.ok || !access.team) return { ok: false, message: access.message };
    const team = access.team as {
      id: string;
      organization_id: string;
      season_id: string;
      name: string;
    };
    const practiceRunResult = input.practiceRunId
      ? await runDynamicQuery<{
        id: string;
        team_id: string;
        coach_user_id: string;
        completed_at: string | null;
        observations_json: Record<string, unknown>;
        parent_replay_id: string | null;
      }>(db
        .from("practice_run_receipts")
        .select("id,team_id,coach_user_id,completed_at,observations_json,parent_replay_id")
        .eq("id", input.practiceRunId)
        .maybeSingle())
      : { data: null, error: null };
    if (input.practiceRunId && (
      practiceRunResult.error ||
      !practiceRunResult.data ||
      practiceRunResult.data.team_id !== input.teamId ||
      !practiceRunResult.data.completed_at
    )) {
      return { ok: false, message: "Parent Replay can only attach to a completed practice-run receipt for this team." };
    }
    if (practiceRunResult.data?.parent_replay_id) {
      return { ok: false, message: "This practice-run receipt is already linked to a Parent Replay." };
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
        status: "draft",
        generation_source: "deterministic",
        reviewed_by_user_id: null,
        reviewed_at: null,
        approved_by_user_id: null,
        approved_at: null,
        published_at: null,
        source_manifest_json: [
          ...input.focusAreas.map((area) => ({
            sourceType: "coach_selected_focus",
            sourceId: area,
            included: true,
            observedAt: now
          })),
          ...(practiceRunResult.data ? [{
            sourceType: "completed_practice_run",
            sourceId: practiceRunResult.data.id,
            included: true,
            observedAt: practiceRunResult.data.completed_at
          }] : [])
        ],
        source_hash: createHash("sha256").update(JSON.stringify({
          teamId: input.teamId,
          focusAreas: input.focusAreas,
          generatedAt: input.draft.generatedAt
        })).digest("hex"),
        source_observed_at: now,
        generated_at: input.draft.generatedAt
      })
      .select("id,organization_id,season_id,team_id,coach_user_id,focus_areas,title,summary,home_activities,coach_video,parent_tip,team_quest,skill_cards,parent_education,status,generated_at,created_at")
      .single());

    if (replayError || !replay) return { ok: false, message: "Parent Replay could not be saved." };

    if (practiceRunResult.data) {
      const linked = await runDynamicQuery(db
        .from("practice_run_receipts")
        .update({ parent_replay_id: replay.id })
        .eq("id", practiceRunResult.data.id)
        .is("parent_replay_id", null)
        .select("id")
        .single());
      if (linked.error || !linked.data) {
        await runDynamicQuery(db.from("parent_replays").delete().eq("id", replay.id));
        return { ok: false, message: "Parent Replay could not be linked to its practice-run evidence." };
      }
    }

    await runDynamicQuery(db
      .from("audit_events")
      .insert({
        organization_id: team.organization_id,
        actor_user_id: input.actorUserId,
        action: "parent_replay_draft_saved",
        target_type: "parent_replay",
        target_id: replay.id,
        summary: `Parent Replay draft saved for ${team.name} with ${input.focusAreas.length} focus areas${practiceRunResult.data ? " and a completed practice-run receipt" : ""}.`
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

    return {
      ok: true,
      message: "Parent Replay draft saved. It is not approved, published, or sent.",
      parentReplay,
      notificationCount: 0
    };
  } catch {
    return { ok: false, message: "Parent Replay could not reach Supabase." };
  }
}

export async function approveParentReplay(input: {
  parentReplayId: string;
  actorUserId: string;
}) {
  if (!input.parentReplayId || !input.actorUserId) {
    return { ok: false, message: "Parent Replay approval requires replay and reviewer." };
  }
  try {
    const db = adminDb();
    const { data: replay, error } = await runDynamicQuery<{
      id: string;
      organization_id: string;
      season_id: string;
      team_id: string;
      approved_at: string | null;
      published_at: string | null;
    }>(db.from("parent_replays")
      .select("id,organization_id,season_id,team_id,approved_at,published_at")
      .eq("id", input.parentReplayId)
      .maybeSingle());
    if (error || !replay) return { ok: false, message: "Parent Replay draft was not found." };
    const access = await requireActiveTeamCoachOrOrgAdmin({
      db,
      teamId: replay.team_id,
      userId: input.actorUserId,
      action: "approve Parent Replay"
    });
    if (!access.ok) return { ok: false, message: access.message };
    if (replay.published_at) {
      return { ok: false, message: "Published Parent Replay records cannot be re-approved." };
    }
    if (replay.approved_at) {
      return { ok: true, message: "Parent Replay was already approved and remains unpublished.", approvedAt: replay.approved_at };
    }
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await runDynamicQuery(db.from("parent_replays")
      .update({
        approved_at: now,
        approved_by_user_id: input.actorUserId,
        reviewed_at: now,
        reviewed_by_user_id: input.actorUserId
      })
      .eq("id", replay.id)
      .is("published_at", null)
      .select("id,approved_at,published_at,status")
      .single());
    if (updateError || !updated) return { ok: false, message: "Parent Replay approval could not be saved." };
    await runDynamicQuery(db.from("audit_events").insert({
      organization_id: replay.organization_id,
      actor_user_id: input.actorUserId,
      action: "parent_replay_approved",
      target_type: "parent_replay",
      target_id: replay.id,
      summary: "Parent Replay approved after human review. It remains unpublished."
    }));
    return { ok: true, message: "Parent Replay approved. Families still cannot see it until publish.", parentReplay: updated };
  } catch {
    return { ok: false, message: "Parent Replay approval could not reach team records." };
  }
}

export async function publishParentReplay(input: {
  parentReplayId: string;
  actorUserId: string;
}) {
  if (!input.parentReplayId || !input.actorUserId) {
    return { ok: false, message: "Parent Replay publish requires replay and reviewer." };
  }
  try {
    const db = adminDb();
    const { data: replay, error } = await runDynamicQuery<{
      id: string;
      organization_id: string;
      season_id: string;
      team_id: string;
      title: string;
      approved_at: string | null;
      published_at: string | null;
      teams: { name: string } | null;
    }>(db.from("parent_replays")
      .select("id,organization_id,season_id,team_id,title,approved_at,published_at,teams(name)")
      .eq("id", input.parentReplayId)
      .maybeSingle());
    if (error || !replay) return { ok: false, message: "Parent Replay draft was not found." };
    const access = await requireActiveTeamCoachOrOrgAdmin({
      db,
      teamId: replay.team_id,
      userId: input.actorUserId,
      action: "publish Parent Replay"
    });
    if (!access.ok) return { ok: false, message: access.message };
    if (!replay.approved_at) {
      return { ok: false, code: "approval_required", message: "Human approval is required before Parent Replay can be published." };
    }
    if (replay.published_at) {
      return { ok: true, message: "Parent Replay was already published. No duplicate notification drafts were created.", publishedAt: replay.published_at };
    }
    const now = new Date().toISOString();
    const { data: published, error: publishError } = await runDynamicQuery(db.from("parent_replays")
      .update({ status: "queued", published_at: now })
      .eq("id", replay.id)
      .not("approved_at", "is", null)
      .is("published_at", null)
      .select("id,status,approved_at,published_at")
      .single());
    if (publishError || !published) return { ok: false, message: "Parent Replay publish could not be saved." };

    const { data: guardianRows } = await runDynamicQuery<Array<{ parent_user_id: string | null }>>(db
      .from("player_guardians")
      .select("parent_user_id,players!inner(team_id)")
      .eq("status", "active")
      .eq("players.team_id", replay.team_id)
      .not("parent_user_id", "is", null));
    const recipientIds = Array.from(new Set((guardianRows ?? [])
      .map((row) => row.parent_user_id)
      .filter(Boolean))) as string[];
    const notificationRows = recipientIds.map((recipientUserId) => ({
      organization_id: replay.organization_id,
      recipient_user_id: recipientUserId,
      team_id: replay.team_id,
      notification_type: "parent_replay_ready",
      title: "Parent Replay is ready",
      body: `${replay.teams?.name ?? "Your team"} has a coach-approved Parent Replay ready in LeaguePilot.`,
      channel: "email",
      status: "pending"
    }));
    const notificationsResult = notificationRows.length
      ? await runDynamicQuery(db.from("notifications").insert(notificationRows).select("id"))
      : { data: [], error: null };
    await runDynamicQuery(db.from("audit_events").insert({
      organization_id: replay.organization_id,
      actor_user_id: input.actorUserId,
      action: "parent_replay_published",
      target_type: "parent_replay",
      target_id: replay.id,
      summary: `Parent Replay published with ${notificationRows.length} in-app notification draft(s).`
    }));
    return {
      ok: true,
      message: notificationsResult.error
        ? "Parent Replay published, but notification drafts require admin recovery. No provider send occurred."
        : `Parent Replay published with ${notificationRows.length} notification draft(s). No provider send occurred.`,
      parentReplay: published,
      notificationCount: notificationsResult.error ? 0 : notificationRows.length
    };
  } catch {
    return { ok: false, message: "Parent Replay publish could not reach team records." };
  }
}

export async function updateParentRsvp(input: {
  eventId: string;
  playerId: string;
  parentUserId: string;
  response: "going" | "not_going" | "maybe" | "cancelled";
  note?: string;
  expectedLockVersion: number;
  expectedScheduleVersion: number;
  clientActionId: string;
  offlineReplay?: boolean;
}) {
  if (!input.eventId || !input.playerId || !input.parentUserId || !input.clientActionId) {
    return { ok: false, code: "invalid_request", message: "RSVP requires event, player, parent, and action receipt." };
  }
  try {
    const db = adminDb();
    const access = await requireActiveParentForPlayerEvent({
      db,
      parentUserId: input.parentUserId,
      playerId: input.playerId,
      eventId: input.eventId
    });
    if (!access.ok) return { ok: false, message: access.message };
    if (input.offlineReplay) {
      const { data: event } = await runDynamicQuery<{ organization_id: string }>(db
        .from("events")
        .select("organization_id")
        .eq("id", input.eventId)
        .single());
      const organizationResult = event?.organization_id
        ? await runDynamicQuery<{ offline_writes_enabled: boolean }>(db
          .from("organizations")
          .select("offline_writes_enabled")
          .eq("id", event.organization_id)
          .single())
        : { data: null, error: null };
      const gate = featureGateDecision({
        feature: "offline_writes",
        organizationEnabled: organizationResult.data?.offline_writes_enabled
      });
      if (!gate.enabled) {
        return {
          ok: false,
          code: "offline_disabled",
          message: "This saved device action must be retried online because offline writes are disabled."
        };
      }
    }

    const payloadHash = createHash("sha256")
      .update(JSON.stringify({
        eventId: input.eventId,
        playerId: input.playerId,
        response: input.response,
        note: input.note ?? null,
        expectedLockVersion: input.expectedLockVersion,
        expectedScheduleVersion: input.expectedScheduleVersion
      }))
      .digest("hex");
    const { data, error } = await runDynamicQuery<Record<string, unknown>>(db.rpc(
      "save_parent_rsvp_with_versions",
      {
        p_event_id: input.eventId,
        p_player_id: input.playerId,
        p_parent_user_id: input.parentUserId,
        p_response: input.response,
        p_note: input.note ?? null,
        p_expected_lock_version: input.expectedLockVersion,
        p_expected_schedule_version: input.expectedScheduleVersion,
        p_client_action_id: input.clientActionId,
        p_context_key: `parent:${input.eventId}:${input.playerId}`,
        p_payload_hash: payloadHash
      }
    ));
    if (error || !data) {
      return { ok: false, code: "unavailable", message: "RSVP could not be saved." };
    }
    return data;
  } catch {
    return { ok: false, code: "unavailable", message: "RSVP could not reach team records." };
  }
}

export async function submitParentSupportRequest(input: {
  parentUserId: string;
  teamId?: string;
  topic: "schedule" | "rsvp" | "registration" | "media" | "notifications" | "other";
  detail: string;
}) {
  const detail = input.detail.trim();
  if (!input.parentUserId || !detail) {
    return { ok: false, message: "Support request requires a signed-in parent and details." };
  }

  try {
    const db = adminDb();
    let teamQuery = db
      .from("players")
      .select("team_id,organization_id,player_guardians!inner(id,parent_user_id,status)")
      .eq("player_guardians.parent_user_id", input.parentUserId)
      .eq("player_guardians.status", "active")
      .limit(1);

    if (input.teamId) teamQuery = teamQuery.eq("team_id", input.teamId);

    const { data: linkedPlayers, error: linkError } = await runDynamicQuery<Array<{ team_id: string; organization_id: string }>>(teamQuery);
    const linkedPlayer = linkedPlayers?.[0];
    if (linkError || !linkedPlayer) {
      return { ok: false, message: "Support request requires an active parent-child team link." };
    }

    const { data, error } = await runDynamicQuery(db
      .from("support_requests")
      .insert({
        organization_id: linkedPlayer.organization_id,
        team_id: input.teamId ?? linkedPlayer.team_id,
        parent_user_id: input.parentUserId,
        topic: input.topic,
        detail,
        status: "open",
        context_json: {
          source: "parent_dashboard",
          requestedTeamId: input.teamId ?? linkedPlayer.team_id
        }
      })
      .select("id,team_id,parent_user_id,topic,status,created_at")
      .single());

    if (error || !data) return { ok: false, message: "Support request could not be saved." };
    return { ok: true, message: "Support request saved for staff review.", supportRequest: data };
  } catch {
    return { ok: false, message: "Support request could not reach Supabase." };
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
      private_object_path: string | null;
      scan_completed_at: string | null;
      family_release_approved_at: string | null;
      moderation_status: string;
      visibility: string;
    }>(db
      .from("media_items")
      .select("id,organization_id,team_id,title,private_object_path,scan_completed_at,family_release_approved_at,moderation_status,visibility")
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
    if (input.status === "approved" && mediaItem.private_object_path
      && (!mediaItem.scan_completed_at || !mediaItem.family_release_approved_at)) {
      return {
        ok: false,
        message: "Uploaded media cannot be approved until verified scan and family-release evidence are complete."
      };
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

    await runDynamicQuery(db.from("media_review_history").insert({
      media_item_id: mediaItem.id,
      reviewer_user_id: input.reviewerUserId,
      previous_values_json: {
        moderationStatus: mediaItem.moderation_status,
        visibility: mediaItem.visibility
      },
      next_values_json: {
        moderationStatus: input.status,
        visibility: input.visibility ?? mediaItem.visibility
      },
      reason: reason ?? `Media set to ${input.status}.`,
      consent_evidence_json: {
        scanCompletedAt: mediaItem.scan_completed_at,
        familyReleaseApprovedAt: mediaItem.family_release_approved_at
      }
    }));

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

  try {
    const db = adminDb();
    const { data: event } = await db
      .from("events")
      .select("id,organization_id,team_id,title,starts_at,location_name,location_address,latitude,longitude")
      .eq("id", input.eventId)
      .single();
    if (!event) return { ok: false, message: "Weather lookup requires a known event." };

    const forecast = await getWeatherEventDraft({
      teamId: event.team_id,
      eventId: event.id,
      eventTitle: event.title,
      startsAt: event.starts_at,
      latitude: event.latitude ?? undefined,
      longitude: event.longitude ?? undefined,
      locationName: event.location_name ?? undefined,
      locationAddress: event.location_address ?? undefined
    }, {
      now: new Date().toISOString(),
      tomorrowApiKey: process.env.TOMORROW_API_KEY || process.env.WEATHER_PROVIDER_API_KEY,
      userAgent: process.env.WEATHER_USER_AGENT
    });

    if (!forecast) {
      return { ok: false, message: "Weather provider lookup returned no draft for this event." };
    }
    const draft = forecast.draft;

    const { data, error } = await db
      .from("weather_alerts")
      .insert({
        team_id: event.team_id,
        event_id: event.id,
        headline: draft.headline,
        detail: draft.detail,
        severity: draft.severity,
        status: "draft",
        provider: forecast.providerId,
        provider_payload: forecast.raw,
        reviewed_by_user_id: input.reviewerUserId ?? null,
        reviewed_at: input.reviewerUserId ? new Date().toISOString() : null
      })
      .select("id,headline,detail,severity,status,provider,created_at")
      .single();

    if (error || !data) return { ok: false, message: "Weather alert draft could not be saved. Make sure migration 0005 is applied." };
    return { ok: true, message: `${forecast.providerId} weather alert draft saved. No parent notification was sent.`, alert: data };
  } catch {
    return { ok: false, message: "Weather lookup could not reach the configured provider chain or Supabase." };
  }
}
