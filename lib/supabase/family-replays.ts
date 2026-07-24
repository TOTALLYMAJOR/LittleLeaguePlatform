import type { ParentReplayHomeActivity, PracticeFocusArea } from "@/lib/domain";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Family Replay reads span staged migrations 0023 and 0031.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(name: string, parameters: Record<string, unknown>): any;
  storage: ReturnType<typeof createSupabaseAdminClient>["storage"];
};

export interface FamilyReplayMedia {
  id: string;
  mediaType: "photo" | "video" | "youtube";
  url: string;
  altText: string;
  transcript?: string;
  approvedAt: string;
}

export interface FamilyReplayStory {
  id: string;
  organizationId: string;
  seasonId: string;
  teamId: string;
  teamName: string;
  childLabels: string[];
  coachName: string;
  title: string;
  summary: string;
  focusAreas: PracticeFocusArea[];
  homeActivities: ParentReplayHomeActivity[];
  parentTip: string;
  parentEducation: string;
  teamQuest: string;
  skillCards: string[];
  publishedAt: string;
  approvedAt?: string;
  savedAt?: string;
  activityCompletedAt?: string;
  media: FamilyReplayMedia[];
}

export interface FamilyReplayData {
  ok: boolean;
  message: string;
  replays: FamilyReplayStory[];
}

type ReplayRow = {
  id: string;
  organization_id: string;
  season_id: string;
  team_id: string;
  coach_user_id: string;
  focus_areas: string[];
  title: string;
  summary: string;
  home_activities: unknown;
  parent_tip: string;
  team_quest: string;
  skill_cards: string[];
  parent_education: string;
  status: string;
  approved_at?: string | null;
  published_at?: string | null;
  created_at: string;
};

const focusAreas = new Set<PracticeFocusArea>([
  "catching", "throwing", "teamwork", "spacing", "hitting", "base_running",
  "listening", "sportsmanship"
]);

function normalizeFocusAreas(values: string[]): PracticeFocusArea[] {
  return values.filter((value): value is PracticeFocusArea => focusAreas.has(value as PracticeFocusArea));
}

function normalizeActivities(value: unknown): ParentReplayHomeActivity[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): ParentReplayHomeActivity[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const duration = record.duration;
    if (!["30_seconds", "2_minutes", "5_minutes"].includes(String(duration))) return [];
    if (typeof record.title !== "string" || !Array.isArray(record.steps)) return [];
    const steps = record.steps.filter((step): step is string => typeof step === "string").slice(0, 8);
    if (!steps.length) return [];
    return [{
      duration: duration as ParentReplayHomeActivity["duration"],
      title: record.title,
      coachCue: typeof record.coachCue === "string" ? record.coachCue : undefined,
      parentGoal: typeof record.parentGoal === "string" ? record.parentGoal : undefined,
      steps
    }];
  });
}

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

async function loadFamilyMedia(
  db: UnsafeSupabase,
  replayIds: string[]
): Promise<Map<string, FamilyReplayMedia[]>> {
  const byReplay = new Map<string, FamilyReplayMedia[]>();
  if (!replayIds.length) return byReplay;
  try {
    const { data: publications, error } = await withSupabaseTimeout(db
      .from("parent_replay_family_media")
      .select("id,parent_replay_id,team_id,media_item_id,subject_player_ids,alt_text,transcript,approved_at")
      .in("parent_replay_id", replayIds)
      .is("revoked_at", null), 7000) as {
        data: Array<{
          id: string;
          parent_replay_id: string;
          team_id: string;
          media_item_id: string;
          subject_player_ids: string[];
          alt_text: string;
          transcript: string | null;
          approved_at: string;
        }> | null;
        error?: { message?: string } | null;
      };
    if (error || !publications?.length) return byReplay;
    const mediaIds = [...new Set(publications.map((publication) => publication.media_item_id))];
    const subjectIds = [...new Set(publications.flatMap((publication) => publication.subject_player_ids))];
    const [{ data: mediaRows }, { data: guardianRows }, { data: consentRows }, { data: subjectPlayers }] = await withSupabaseTimeout(Promise.all([
      db.from("media_items")
        .select("id,media_type,url,private_object_path,moderation_status,scan_completed_at,family_release_approved_at,storage_deleted_at")
        .in("id", mediaIds),
      db.from("player_guardians")
        .select("player_id,parent_user_id,status")
        .in("player_id", subjectIds)
        .eq("status", "active"),
      db.from("player_media_consents")
        .select("player_id,guardian_user_id,scope,granted_at,revoked_at")
        .in("player_id", subjectIds)
        .eq("scope", "team_family"),
      db.from("players")
        .select("id,team_id")
        .in("id", subjectIds)
    ]), 7000) as [
      { data: Array<{ id: string; media_type: FamilyReplayMedia["mediaType"]; url: string; private_object_path: string | null; moderation_status: string; scan_completed_at: string | null; family_release_approved_at: string | null; storage_deleted_at: string | null }> | null },
      { data: Array<{ player_id: string; parent_user_id: string | null; status: string }> | null },
      { data: Array<{ player_id: string; guardian_user_id: string; scope: string; granted_at: string | null; revoked_at: string | null }> | null },
      { data: Array<{ id: string; team_id: string }> | null }
    ];
    const mediaById = new Map((mediaRows ?? []).map((media) => [media.id, media]));
    for (const publication of publications) {
      const media = mediaById.get(publication.media_item_id);
      if (!media ||
        media.moderation_status !== "approved" ||
        !media.family_release_approved_at ||
        media.storage_deleted_at ||
        (media.private_object_path && !media.scan_completed_at)) continue;
      const currentGuardians = (guardianRows ?? []).filter((guardian) => (
        publication.subject_player_ids.includes(guardian.player_id)
      ));
      const everySubjectStillOnTeam = publication.subject_player_ids.every((playerId) => (
        (subjectPlayers ?? []).some((player) => player.id === playerId && player.team_id === publication.team_id)
      ));
      const everySubjectHasGuardian = publication.subject_player_ids.every((playerId) => (
        currentGuardians.some((guardian) => guardian.player_id === playerId && guardian.parent_user_id)
      ));
      const everyGuardianConsented = currentGuardians.length > 0 && currentGuardians.every((guardian) => (
        Boolean(guardian.parent_user_id) &&
        (consentRows ?? []).some((consent) => (
          consent.player_id === guardian.player_id &&
          consent.guardian_user_id === guardian.parent_user_id &&
          Boolean(consent.granted_at) &&
          !consent.revoked_at
        ))
      ));
      if (!everySubjectStillOnTeam || !everySubjectHasGuardian || !everyGuardianConsented) continue;
      const signedUrl = media.private_object_path
        ? await db.storage.from("leaguepilot-private-media").createSignedUrl(media.private_object_path, 300)
        : null;
      const url = signedUrl?.data?.signedUrl ?? (media.private_object_path ? "" : media.url);
      if (!url) continue;
      const item: FamilyReplayMedia = {
        id: publication.id,
        mediaType: media.media_type,
        url,
        altText: publication.alt_text,
        transcript: publication.transcript ?? undefined,
        approvedAt: publication.approved_at
      };
      byReplay.set(publication.parent_replay_id, [...(byReplay.get(publication.parent_replay_id) ?? []), item]);
    }
  } catch {
    // Migration 0031 is optional until ordered promotion. Text Replays remain usable.
  }
  return byReplay;
}

export async function listFamilyReplays(input: {
  parentUserId: string;
}): Promise<FamilyReplayData> {
  if (!input.parentUserId) return { ok: false, message: "Signed-in family access is required.", replays: [] };
  try {
    const db = dbClient();
    const { data: guardianRows, error: guardianError } = await withSupabaseTimeout(db
      .from("player_guardians")
      .select("player_id")
      .eq("parent_user_id", input.parentUserId)
      .eq("status", "active"), 7000) as {
        data: Array<{ player_id: string }> | null;
        error?: { message?: string } | null;
      };
    if (guardianError || !guardianRows?.length) {
      return { ok: false, message: "No current child links are available for Parent Replay.", replays: [] };
    }
    const playerIds = guardianRows.map((guardian) => guardian.player_id);
    const { data: players, error: playerError } = await withSupabaseTimeout(db
      .from("players")
      .select("id,team_id,first_name,last_initial")
      .in("id", playerIds), 7000) as {
        data: Array<{ id: string; team_id: string; first_name: string; last_initial: string }> | null;
        error?: { message?: string } | null;
      };
    if (playerError || !players?.length) {
      return { ok: false, message: "Current child links could not be verified.", replays: [] };
    }
    const teamIds = [...new Set(players.map((player) => player.team_id))];
    const [{ data: teams }, { data: replayRows, error: replayError }] = await withSupabaseTimeout(Promise.all([
      db.from("teams").select("id,name").in("id", teamIds),
      db.from("parent_replays")
        .select("*")
        .in("team_id", teamIds)
        .eq("status", "queued")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(100)
    ]), 7000) as [
      { data: Array<{ id: string; name: string }> | null },
      { data: ReplayRow[] | null; error?: { message?: string } | null }
    ];
    if (replayError) {
      return { ok: false, message: "Published Parent Replays are temporarily unavailable.", replays: [] };
    }
    const rows = replayRows ?? [];
    const coachIds = [...new Set(rows.map((replay) => replay.coach_user_id))];
    const [{ data: coaches }, engagementResult] = await withSupabaseTimeout(Promise.all([
      coachIds.length
        ? db.from("profiles").select("id,display_name").in("id", coachIds)
        : Promise.resolve({ data: [] }),
      rows.length
        ? db.from("parent_replay_engagement")
          .select("parent_replay_id,saved_at,activity_completed_at")
          .eq("parent_user_id", input.parentUserId)
          .in("parent_replay_id", rows.map((replay) => replay.id))
        : Promise.resolve({ data: [] })
    ]), 7000).catch(() => [{ data: [] }, { data: [] }]) as [
      { data: Array<{ id: string; display_name: string }> | null },
      { data: Array<{ parent_replay_id: string; saved_at: string | null; activity_completed_at: string | null }> | null }
    ];
    const familyMedia = await loadFamilyMedia(db, rows.map((replay) => replay.id));
    const teamNames = new Map((teams ?? []).map((team) => [team.id, team.name]));
    const coachNames = new Map((coaches ?? []).map((coach) => [coach.id, coach.display_name]));
    const engagements = new Map((engagementResult.data ?? []).map((engagement) => [engagement.parent_replay_id, engagement]));
    const replays = rows.map((replay): FamilyReplayStory => {
      const engagement = engagements.get(replay.id);
      return {
        id: replay.id,
        organizationId: replay.organization_id,
        seasonId: replay.season_id,
        teamId: replay.team_id,
        teamName: teamNames.get(replay.team_id) ?? "Linked team",
        childLabels: players
          .filter((player) => player.team_id === replay.team_id)
          .map((player) => `${player.first_name} ${player.last_initial}.`),
        coachName: coachNames.get(replay.coach_user_id) ?? "Team coach",
        title: replay.title,
        summary: replay.summary,
        focusAreas: normalizeFocusAreas(replay.focus_areas),
        homeActivities: normalizeActivities(replay.home_activities),
        parentTip: replay.parent_tip,
        parentEducation: replay.parent_education,
        teamQuest: replay.team_quest,
        skillCards: replay.skill_cards,
        publishedAt: replay.published_at ?? replay.created_at,
        approvedAt: replay.approved_at ?? undefined,
        savedAt: engagement?.saved_at ?? undefined,
        activityCompletedAt: engagement?.activity_completed_at ?? undefined,
        media: familyMedia.get(replay.id) ?? []
      };
    });
    return {
      ok: true,
      message: replays.length
        ? "Showing coach-approved Parent Replays for your linked children."
        : "No coach-approved Parent Replay has been published yet.",
      replays
    };
  } catch {
    return { ok: false, message: "Parent Replay could not reach current family records.", replays: [] };
  }
}

export async function recordFamilyReplayEngagement(input: {
  replayId: string;
  parentUserId: string;
  operation: "viewed" | "activity_completed" | "saved";
}) {
  if (!input.replayId || !input.parentUserId) {
    return { ok: false, message: "Parent Replay and signed-in family are required." };
  }
  try {
    const { data, error } = await withSupabaseTimeout(dbClient().rpc("record_parent_replay_engagement", {
      target_parent_replay_id: input.replayId,
      target_parent_user_id: input.parentUserId,
      target_operation: input.operation
    }), 7000) as {
      data: Record<string, unknown> | null;
      error?: { message?: string } | null;
    };
    if (error || !data) return { ok: false, message: "Parent Replay action could not be saved." };
    return { ...data, message: input.operation === "saved" ? "Saved to your family Replay shelf." : input.operation === "activity_completed" ? "Marked as tried. This is private to your family." : "Replay view recorded." };
  } catch {
    return { ok: false, message: "Parent Replay action is unavailable. Your activity was not changed." };
  }
}
