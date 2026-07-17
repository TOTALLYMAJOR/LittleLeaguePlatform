import {
  isDrillVideoDifficulty,
  isSupportedDrillVideoProvider,
  normalizeDrillText,
  seedState,
  validateDrillVideoAssignment,
  validateDrillVideoForApproval,
  type DrillVideo,
  type DrillVideoApprovalStatus,
  type DrillVideoAssignment,
  type DrillVideoAssignmentContext,
  type DrillVideoDifficulty,
  type DrillVideoSource,
  type DrillVideoSourceStatus,
  type LeagueEvent,
  type Team
} from "@/lib/domain";
import { fetchYouTubeDrillVideoMetadata } from "@/lib/services/youtube/drill-video-metadata";
import { requireActiveOrganizationAdmin, requireActiveTeamCoachOrOrgAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Drill video tables are staged until generated Supabase types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

interface DynamicQueryResult<T = unknown> {
  data: T | null;
  error: { message?: string } | null;
}

type DrillVideoRow = {
  id: string;
  organization_id: string;
  provider: DrillVideo["provider"];
  external_video_id: string;
  canonical_url: string;
  title: string;
  thumbnail_url: string;
  sport: string;
  skill_category: string;
  age_band: string;
  difficulty: DrillVideoDifficulty;
  duration_seconds: number | null;
  coach_instructions: string | null;
  safety_notes: string | null;
  source_channel: string | null;
  source_channel_id: string | null;
  approval_status: DrillVideoApprovalStatus;
  approved_by_user_id: string | null;
  approved_at: string | null;
  review_notes: string | null;
  made_for_kids_status: boolean | null;
  embeddable: boolean;
  last_validated_at: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type DrillVideoSourceRow = {
  id: string;
  organization_id: string;
  provider: "youtube";
  external_channel_id: string;
  title: string;
  approval_status: DrillVideoSourceStatus;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

type DrillVideoAssignmentRow = {
  id: string;
  organization_id: string;
  drill_video_id: string;
  team_id: string;
  event_id: string | null;
  assigned_by_user_id: string;
  usage_context: DrillVideoAssignmentContext;
  notes: string | null;
  visible_to_families: boolean;
  created_at: string;
};

export interface DrillVideoLibraryData {
  teams: Team[];
  events: LeagueEvent[];
  drillVideos: DrillVideo[];
  sources: DrillVideoSource[];
  assignments: DrillVideoAssignment[];
  isSupabaseBacked: boolean;
  providerConfigured: boolean;
  message: string;
}

function adminDb() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

function runDynamicQuery<T>(operation: PromiseLike<unknown>, milliseconds = 7000) {
  return withSupabaseTimeout(operation as PromiseLike<DynamicQueryResult<T>>, milliseconds);
}

function fallbackDrillVideoLibraryData(message = "Showing local drill video shell until Supabase drill library rows are available."): DrillVideoLibraryData {
  return {
    teams: seedState.teams,
    events: seedState.events.filter((event) => event.eventType === "practice"),
    drillVideos: [],
    sources: [],
    assignments: [],
    isSupabaseBacked: false,
    providerConfigured: Boolean(process.env.YOUTUBE_DATA_API_KEY),
    message
  };
}

export async function listCoachDrillVideoLibraryData(input: {
  coachTeamIds: string[];
  viewerUserId?: string;
}): Promise<DrillVideoLibraryData> {
  if (!input.coachTeamIds.length) {
    return fallbackDrillVideoLibraryData("No active coach teams are available for drill video planning.");
  }

  try {
    const db = adminDb();
    const { data: teams, error: teamsError } = await runDynamicQuery<Array<{
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
    }>>(db
      .from("teams")
      .select("id,organization_id,season_id,division,name,coach_user_id,mascot,primary_color,secondary_color,theme_key")
      .in("id", input.coachTeamIds)
      .order("name", { ascending: true }));

    if (teamsError || !teams?.length) return fallbackDrillVideoLibraryData("Coach drill video teams could not be loaded.");
    const organizationIds = unique(teams.map((team) => team.organization_id));
    const teamIds = teams.map((team) => team.id);
    const [eventsResult, videosResult, sourcesResult, assignmentsResult] = await Promise.all([
      runDynamicQuery<Array<LeagueEventRow>>(db
        .from("events")
        .select("id,organization_id,team_id,season_id,title,event_type,starts_at,ends_at,location_name,location_address,opponent,status,created_at,updated_at")
        .in("team_id", teamIds)
        .eq("event_type", "practice")
        .order("starts_at", { ascending: true })),
      runDynamicQuery<DrillVideoRow[]>(db
        .from("drill_videos")
        .select(DRILL_VIDEO_SELECT)
        .in("organization_id", organizationIds)
        .order("created_at", { ascending: false })),
      runDynamicQuery<DrillVideoSourceRow[]>(db
        .from("drill_video_sources")
        .select(DRILL_VIDEO_SOURCE_SELECT)
        .in("organization_id", organizationIds)
        .order("created_at", { ascending: false })),
      runDynamicQuery<DrillVideoAssignmentRow[]>(db
        .from("drill_video_assignments")
        .select(DRILL_VIDEO_ASSIGNMENT_SELECT)
        .in("team_id", teamIds)
        .order("created_at", { ascending: false }))
    ]);

    if (videosResult.error || sourcesResult.error || assignmentsResult.error) {
      return fallbackDrillVideoLibraryData("Supabase drill video library rows are not available yet.");
    }

    const drillVideos = (videosResult.data ?? [])
      .map(mapDrillVideo)
      .filter((video) => video.approvalStatus === "approved" || video.createdByUserId === input.viewerUserId);

    return {
      teams: teams.map(mapTeam),
      events: (eventsResult.data ?? []).map(mapLeagueEvent),
      drillVideos,
      sources: (sourcesResult.data ?? []).map(mapDrillVideoSource),
      assignments: (assignmentsResult.data ?? []).map(mapDrillVideoAssignment),
      isSupabaseBacked: true,
      providerConfigured: Boolean(process.env.YOUTUBE_DATA_API_KEY),
      message: "Showing Supabase-backed approved drill video references for coach planning. Videos are embedded from YouTube; no copied media is stored."
    };
  } catch {
    return fallbackDrillVideoLibraryData("Coach drill video library could not reach Supabase.");
  }
}

export async function listAdminDrillVideoLibraryData(input: {
  organizationIds: string[];
}): Promise<DrillVideoLibraryData> {
  if (!input.organizationIds.length) {
    return fallbackDrillVideoLibraryData("No active admin organization is available for drill video review.");
  }

  try {
    const db = adminDb();
    const [teamsResult, videosResult, sourcesResult] = await Promise.all([
      runDynamicQuery<Array<{
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
      }>>(db
        .from("teams")
        .select("id,organization_id,season_id,division,name,coach_user_id,mascot,primary_color,secondary_color,theme_key")
        .in("organization_id", input.organizationIds)
        .order("name", { ascending: true })),
      runDynamicQuery<DrillVideoRow[]>(db
        .from("drill_videos")
        .select(DRILL_VIDEO_SELECT)
        .in("organization_id", input.organizationIds)
        .order("created_at", { ascending: false })),
      runDynamicQuery<DrillVideoSourceRow[]>(db
        .from("drill_video_sources")
        .select(DRILL_VIDEO_SOURCE_SELECT)
        .in("organization_id", input.organizationIds)
        .order("created_at", { ascending: false }))
    ]);

    if (teamsResult.error || videosResult.error || sourcesResult.error) {
      return fallbackDrillVideoLibraryData("Supabase drill video review rows are not available yet.");
    }

    const teamIds = (teamsResult.data ?? []).map((team) => team.id);
    const [eventsResult, assignmentsResult] = teamIds.length ? await Promise.all([
      runDynamicQuery<Array<LeagueEventRow>>(db
        .from("events")
        .select("id,organization_id,team_id,season_id,title,event_type,starts_at,ends_at,location_name,location_address,opponent,status,created_at,updated_at")
        .in("team_id", teamIds)
        .eq("event_type", "practice")
        .order("starts_at", { ascending: true })),
      runDynamicQuery<DrillVideoAssignmentRow[]>(db
        .from("drill_video_assignments")
        .select(DRILL_VIDEO_ASSIGNMENT_SELECT)
        .in("team_id", teamIds)
        .order("created_at", { ascending: false }))
    ]) : [{ data: [], error: null }, { data: [], error: null }];

    return {
      teams: (teamsResult.data ?? []).map(mapTeam),
      events: (eventsResult.data ?? []).map(mapLeagueEvent),
      drillVideos: (videosResult.data ?? []).map(mapDrillVideo),
      sources: (sourcesResult.data ?? []).map(mapDrillVideoSource),
      assignments: (assignmentsResult.data ?? []).map(mapDrillVideoAssignment),
      isSupabaseBacked: true,
      providerConfigured: Boolean(process.env.YOUTUBE_DATA_API_KEY),
      message: "Showing Supabase-backed drill video review rows. Admin approval governs the club library before coaches can assign videos."
    };
  } catch {
    return fallbackDrillVideoLibraryData("Admin drill video library could not reach Supabase.");
  }
}

export async function submitCoachDrillVideoReference(input: {
  actorUserId: string;
  teamId: string;
  provider?: string;
  url: string;
  sport: string;
  skillCategory: string;
  ageBand: string;
  difficulty: string;
  coachInstructions?: string;
  safetyNotes?: string;
}) {
  if (!input.actorUserId || !input.teamId || !input.url) {
    return { ok: false, message: "Drill video submission requires a signed-in coach, team, and URL." };
  }
  const provider = input.provider ?? "youtube";
  if (!isSupportedDrillVideoProvider(provider)) {
    return { ok: false, message: "Only YouTube drill video references are supported in v1." };
  }
  if (!isDrillVideoDifficulty(input.difficulty)) {
    return { ok: false, message: "Drill video difficulty must be beginner, intermediate, or advanced." };
  }

  try {
    const db = adminDb();
    const access = await requireActiveTeamCoachOrOrgAdmin({
      db,
      teamId: input.teamId,
      userId: input.actorUserId,
      action: "submit drill videos"
    });
    if (!access.ok || !access.team) return { ok: false, message: access.message };

    const metadataResult = await fetchYouTubeDrillVideoMetadata({
      url: input.url,
      sport: normalizeDrillText(input.sport, "general"),
      skillCategory: normalizeDrillText(input.skillCategory, "general skills"),
      ageBand: normalizeDrillText(input.ageBand, "all ages"),
      difficulty: input.difficulty
    });
    if (!metadataResult.ok || !metadataResult.metadata) return metadataResult;
    if (!metadataResult.metadata.sourceChannelId) {
      return { ok: false, message: "YouTube metadata did not include a source channel, so the drill video was not saved." };
    }

    const team = access.team as { organization_id: string; name?: string };
    const existingVideoResult = await runDynamicQuery<DrillVideoRow>(db
      .from("drill_videos")
      .select(DRILL_VIDEO_SELECT)
      .eq("organization_id", team.organization_id)
      .eq("provider", "youtube")
      .eq("external_video_id", metadataResult.metadata.externalVideoId)
      .maybeSingle());

    if (existingVideoResult.data) {
      return {
        ok: true,
        message: "Drill video reference already exists for this organization. No copied video media was stored.",
        drillVideo: mapDrillVideo(existingVideoResult.data)
      };
    }

    const source = await ensurePendingDrillVideoSource(db, {
      organizationId: team.organization_id,
      externalChannelId: metadataResult.metadata.sourceChannelId,
      title: metadataResult.metadata.sourceChannel ?? "Unknown YouTube channel"
    });

    const { data: row, error } = await runDynamicQuery<DrillVideoRow>(db
      .from("drill_videos")
      .insert({
        organization_id: team.organization_id,
        provider: "youtube",
        external_video_id: metadataResult.metadata.externalVideoId,
        canonical_url: metadataResult.metadata.canonicalUrl,
        title: metadataResult.metadata.title,
        thumbnail_url: metadataResult.metadata.thumbnailUrl,
        sport: metadataResult.metadata.sport,
        skill_category: metadataResult.metadata.skillCategory,
        age_band: metadataResult.metadata.ageBand,
        difficulty: metadataResult.metadata.difficulty,
        duration_seconds: metadataResult.metadata.durationSeconds ?? null,
        coach_instructions: normalizeOptionalText(input.coachInstructions),
        safety_notes: normalizeOptionalText(input.safetyNotes),
        source_channel: metadataResult.metadata.sourceChannel ?? null,
        source_channel_id: metadataResult.metadata.sourceChannelId,
        approval_status: "pending",
        made_for_kids_status: metadataResult.metadata.madeForKidsStatus ?? null,
        embeddable: true,
        last_validated_at: metadataResult.metadata.lastValidatedAt,
        created_by_user_id: input.actorUserId,
        metadata_json: metadataResult.metadata.metadata
      })
      .select(DRILL_VIDEO_SELECT)
      .single());

    if (error || !row) return { ok: false, message: "Drill video reference could not be saved." };

    await runDynamicQuery(db
      .from("audit_events")
      .insert({
        organization_id: team.organization_id,
        actor_user_id: input.actorUserId,
        action: "drill_video_submitted",
        target_type: "drill_video",
        target_id: row.id,
        summary: `${row.title} submitted for admin drill video review. Source channel status: ${source?.approvalStatus ?? "pending"}.`
      }));

    return {
      ok: true,
      message: "Drill video reference saved for admin review. YouTube media stays embedded from the official player; no video was downloaded or rehosted.",
      drillVideo: mapDrillVideo(row),
      source
    };
  } catch {
    return { ok: false, message: "Drill video reference could not reach Supabase or YouTube." };
  }
}

export async function reviewDrillVideoSource(input: {
  sourceId: string;
  reviewerUserId: string;
  status: "approved" | "blocked";
  reviewNotes?: string;
}) {
  if (!input.sourceId || !input.reviewerUserId) return { ok: false, message: "Drill video source review requires a source and reviewer." };

  try {
    const db = adminDb();
    const { data: source, error: sourceError } = await runDynamicQuery<DrillVideoSourceRow>(db
      .from("drill_video_sources")
      .select(DRILL_VIDEO_SOURCE_SELECT)
      .eq("id", input.sourceId)
      .single());
    if (sourceError || !source) return { ok: false, message: "Drill video source could not be found." };

    const access = await requireActiveOrganizationAdmin({
      db,
      organizationId: source.organization_id,
      userId: input.reviewerUserId,
      action: "review drill video sources"
    });
    if (!access.ok) return { ok: false, message: access.message };

    const now = new Date().toISOString();
    const { data: row, error } = await runDynamicQuery<DrillVideoSourceRow>(db
      .from("drill_video_sources")
      .update({
        approval_status: input.status,
        reviewed_by_user_id: input.reviewerUserId,
        reviewed_at: now,
        review_notes: normalizeOptionalText(input.reviewNotes)
      })
      .eq("id", input.sourceId)
      .select(DRILL_VIDEO_SOURCE_SELECT)
      .single());
    if (error || !row) return { ok: false, message: "Drill video source review could not be saved." };

    await runDynamicQuery(db
      .from("audit_events")
      .insert({
        organization_id: source.organization_id,
        actor_user_id: input.reviewerUserId,
        action: `drill_video_source_${input.status}`,
        target_type: "drill_video_source",
        target_id: source.id,
        summary: `${source.title} set to ${input.status}.`
      }));

    return { ok: true, message: `Drill video source ${input.status}.`, source: mapDrillVideoSource(row) };
  } catch {
    return { ok: false, message: "Drill video source review could not reach Supabase." };
  }
}

export async function reviewDrillVideo(input: {
  drillVideoId: string;
  reviewerUserId: string;
  status: "approved" | "rejected" | "retired";
  reviewNotes?: string;
}) {
  if (!input.drillVideoId || !input.reviewerUserId) return { ok: false, message: "Drill video review requires a video and reviewer." };

  try {
    const db = adminDb();
    const { data: videoRow, error: videoError } = await runDynamicQuery<DrillVideoRow>(db
      .from("drill_videos")
      .select(DRILL_VIDEO_SELECT)
      .eq("id", input.drillVideoId)
      .single());
    if (videoError || !videoRow) return { ok: false, message: "Drill video could not be found." };

    const access = await requireActiveOrganizationAdmin({
      db,
      organizationId: videoRow.organization_id,
      userId: input.reviewerUserId,
      action: "review drill videos"
    });
    if (!access.ok) return { ok: false, message: access.message };

    const sourceResult = videoRow.source_channel_id ? await runDynamicQuery<DrillVideoSourceRow>(db
      .from("drill_video_sources")
      .select(DRILL_VIDEO_SOURCE_SELECT)
      .eq("organization_id", videoRow.organization_id)
      .eq("provider", "youtube")
      .eq("external_channel_id", videoRow.source_channel_id)
      .maybeSingle()) : { data: null, error: null };

    const video = mapDrillVideo(videoRow);
    const source = sourceResult.data ? mapDrillVideoSource(sourceResult.data) : undefined;
    if (input.status === "approved") {
      const approval = validateDrillVideoForApproval({ video, source });
      if (!approval.ok) return approval;
    }

    const now = new Date().toISOString();
    const { data: row, error } = await runDynamicQuery<DrillVideoRow>(db
      .from("drill_videos")
      .update({
        approval_status: input.status,
        approved_by_user_id: input.status === "approved" ? input.reviewerUserId : null,
        approved_at: input.status === "approved" ? now : null,
        review_notes: normalizeOptionalText(input.reviewNotes)
      })
      .eq("id", input.drillVideoId)
      .select(DRILL_VIDEO_SELECT)
      .single());
    if (error || !row) return { ok: false, message: "Drill video review could not be saved." };

    await runDynamicQuery(db
      .from("audit_events")
      .insert({
        organization_id: videoRow.organization_id,
        actor_user_id: input.reviewerUserId,
        action: `drill_video_${input.status}`,
        target_type: "drill_video",
        target_id: videoRow.id,
        summary: `${videoRow.title} set to ${input.status}.`
      }));

    return { ok: true, message: `Drill video ${input.status}.`, drillVideo: mapDrillVideo(row) };
  } catch {
    return { ok: false, message: "Drill video review could not reach Supabase." };
  }
}

export async function assignDrillVideoToTeam(input: {
  drillVideoId: string;
  teamId: string;
  actorUserId: string;
  eventId?: string;
  usageContext?: DrillVideoAssignmentContext;
  notes?: string;
}) {
  if (!input.drillVideoId || !input.teamId || !input.actorUserId) {
    return { ok: false, message: "Drill video assignment requires video, team, and actor." };
  }

  try {
    const db = adminDb();
    const access = await requireActiveTeamCoachOrOrgAdmin({
      db,
      teamId: input.teamId,
      userId: input.actorUserId,
      action: "assign drill videos"
    });
    if (!access.ok || !access.team) return { ok: false, message: access.message };
    const team = access.team as { organization_id: string };

    const { data: videoRow, error: videoError } = await runDynamicQuery<DrillVideoRow>(db
      .from("drill_videos")
      .select(DRILL_VIDEO_SELECT)
      .eq("id", input.drillVideoId)
      .single());
    if (videoError || !videoRow) return { ok: false, message: "Approved drill video could not be found." };
    if (videoRow.organization_id !== team.organization_id) {
      return { ok: false, message: "Drill video must belong to the same organization as the team." };
    }

    const assignmentCheck = validateDrillVideoAssignment({ video: mapDrillVideo(videoRow), visibleToFamilies: false });
    if (!assignmentCheck.ok) return assignmentCheck;

    if (input.eventId) {
      const { data: event } = await runDynamicQuery<{ id: string; team_id: string; event_type: string }>(db
        .from("events")
        .select("id,team_id,event_type")
        .eq("id", input.eventId)
        .single());
      if (!event || event.team_id !== input.teamId || event.event_type !== "practice") {
        return { ok: false, message: "Drill videos can only be assigned to practices for the selected team." };
      }
    }

    let existingQuery = db
      .from("drill_video_assignments")
      .select(DRILL_VIDEO_ASSIGNMENT_SELECT)
      .eq("drill_video_id", input.drillVideoId)
      .eq("team_id", input.teamId)
      .eq("usage_context", input.usageContext ?? "practice_plan");
    existingQuery = input.eventId ? existingQuery.eq("event_id", input.eventId) : existingQuery.is("event_id", null);
    const existingResult = await runDynamicQuery<DrillVideoAssignmentRow>(existingQuery.maybeSingle());
    if (existingResult.data) {
      return {
        ok: true,
        message: "Drill video is already assigned to this coach planning target.",
        assignment: mapDrillVideoAssignment(existingResult.data)
      };
    }

    const { data: row, error } = await runDynamicQuery<DrillVideoAssignmentRow>(db
      .from("drill_video_assignments")
      .insert({
        organization_id: team.organization_id,
        drill_video_id: input.drillVideoId,
        team_id: input.teamId,
        event_id: input.eventId ?? null,
        assigned_by_user_id: input.actorUserId,
        usage_context: input.usageContext ?? "practice_plan",
        notes: normalizeOptionalText(input.notes),
        visible_to_families: false
      })
      .select(DRILL_VIDEO_ASSIGNMENT_SELECT)
      .single());
    if (error || !row) return { ok: false, message: "Drill video assignment could not be saved." };

    await runDynamicQuery(db
      .from("audit_events")
      .insert({
        organization_id: team.organization_id,
        actor_user_id: input.actorUserId,
        action: "drill_video_assigned",
        target_type: "drill_video_assignment",
        target_id: row.id,
        summary: `${videoRow.title} assigned to coach practice planning. Family-facing embed remains disabled.`
      }));

    return {
      ok: true,
      message: "Drill video assigned to coach practice planning. It is not visible to families in v1.",
      assignment: mapDrillVideoAssignment(row)
    };
  } catch {
    return { ok: false, message: "Drill video assignment could not reach Supabase." };
  }
}

async function ensurePendingDrillVideoSource(db: UnsafeSupabase, input: {
  organizationId: string;
  externalChannelId: string;
  title: string;
}) {
  const existing = await runDynamicQuery<DrillVideoSourceRow>(db
    .from("drill_video_sources")
    .select(DRILL_VIDEO_SOURCE_SELECT)
    .eq("organization_id", input.organizationId)
    .eq("provider", "youtube")
    .eq("external_channel_id", input.externalChannelId)
    .maybeSingle());
  if (existing.data) return mapDrillVideoSource(existing.data);

  const { data } = await runDynamicQuery<DrillVideoSourceRow>(db
    .from("drill_video_sources")
    .insert({
      organization_id: input.organizationId,
      provider: "youtube",
      external_channel_id: input.externalChannelId,
      title: input.title,
      approval_status: "pending"
    })
    .select(DRILL_VIDEO_SOURCE_SELECT)
    .single());
  return data ? mapDrillVideoSource(data) : undefined;
}

const DRILL_VIDEO_SELECT = "id,organization_id,provider,external_video_id,canonical_url,title,thumbnail_url,sport,skill_category,age_band,difficulty,duration_seconds,coach_instructions,safety_notes,source_channel,source_channel_id,approval_status,approved_by_user_id,approved_at,review_notes,made_for_kids_status,embeddable,last_validated_at,created_by_user_id,created_at,updated_at";
const DRILL_VIDEO_SOURCE_SELECT = "id,organization_id,provider,external_channel_id,title,approval_status,reviewed_by_user_id,reviewed_at,review_notes,created_at,updated_at";
const DRILL_VIDEO_ASSIGNMENT_SELECT = "id,organization_id,drill_video_id,team_id,event_id,assigned_by_user_id,usage_context,notes,visible_to_families,created_at";

type LeagueEventRow = {
  id: string;
  organization_id: string;
  team_id: string;
  season_id: string;
  title: string;
  event_type: LeagueEvent["eventType"];
  starts_at: string;
  ends_at: string;
  location_name: string;
  location_address: string;
  opponent: string | null;
  status: LeagueEvent["status"];
  created_at: string;
  updated_at: string;
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

function mapLeagueEvent(row: LeagueEventRow): LeagueEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    teamId: row.team_id,
    seasonId: row.season_id,
    title: row.title,
    eventType: row.event_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    locationName: row.location_name,
    locationAddress: row.location_address,
    opponent: row.opponent ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapDrillVideo(row: DrillVideoRow): DrillVideo {
  return {
    id: row.id,
    organizationId: row.organization_id,
    provider: row.provider,
    externalVideoId: row.external_video_id,
    canonicalUrl: row.canonical_url,
    title: row.title,
    thumbnailUrl: row.thumbnail_url,
    sport: row.sport,
    skillCategory: row.skill_category,
    ageBand: row.age_band,
    difficulty: row.difficulty,
    durationSeconds: row.duration_seconds ?? undefined,
    coachInstructions: row.coach_instructions ?? undefined,
    safetyNotes: row.safety_notes ?? undefined,
    sourceChannel: row.source_channel ?? undefined,
    sourceChannelId: row.source_channel_id ?? undefined,
    approvalStatus: row.approval_status,
    approvedBy: row.approved_by_user_id ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    reviewNotes: row.review_notes ?? undefined,
    madeForKidsStatus: row.made_for_kids_status ?? undefined,
    embeddable: row.embeddable,
    lastValidatedAt: row.last_validated_at ?? undefined,
    createdByUserId: row.created_by_user_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapDrillVideoSource(row: DrillVideoSourceRow): DrillVideoSource {
  return {
    id: row.id,
    organizationId: row.organization_id,
    provider: row.provider,
    externalChannelId: row.external_channel_id,
    title: row.title,
    approvalStatus: row.approval_status,
    reviewedBy: row.reviewed_by_user_id ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewNotes: row.review_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapDrillVideoAssignment(row: DrillVideoAssignmentRow): DrillVideoAssignment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    drillVideoId: row.drill_video_id,
    teamId: row.team_id,
    eventId: row.event_id ?? undefined,
    assignedByUserId: row.assigned_by_user_id,
    usageContext: row.usage_context,
    notes: row.notes ?? undefined,
    visibleToFamilies: row.visible_to_families,
    createdAt: row.created_at
  };
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim().replace(/\s+/g, " ");
  return normalized || null;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
