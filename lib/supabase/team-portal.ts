import type {
  GuardianLink,
  LeagueEvent,
  MediaItem,
  ParentInvite,
  ParentReplayHomeActivity,
  ParentReplayRecord,
  Player,
  PracticeFocusArea,
  Team,
  TeamMembership,
  User
} from "@/lib/domain";
import type { Json } from "./database.types";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

export interface TeamPortalData {
  teams: Team[];
  players: Player[];
  guardianLinks: GuardianLink[];
  parentInvites: ParentInvite[];
  teamMemberships: TeamMembership[];
  users: User[];
  events: LeagueEvent[];
  mediaItems: MediaItem[];
  parentReplays: ParentReplayRecord[];
}

function isFocusArea(value: string): value is PracticeFocusArea {
  return [
    "catching",
    "throwing",
    "teamwork",
    "spacing",
    "hitting",
    "base_running",
    "listening",
    "sportsmanship"
  ].includes(value);
}

const parentTranslationInstructions: Record<PracticeFocusArea, string> = {
  catching: "Show ready hands, toss once, high-five the effort.",
  throwing: "Point, step, throw one ball at a close target.",
  teamwork: "Say one teammate's name and one encouraging phrase.",
  spacing: "Point to open grass, move there, then call for the ball.",
  hitting: "Take three slow-motion swings with eyes on an imaginary ball.",
  base_running: "Sprint to a marker, touch it, and return on the coach call.",
  listening: "Give one cue, have your player repeat it, then act it out.",
  sportsmanship: "Name one brave effort and one kind action from practice."
};

function formatFocusLabel(area: PracticeFocusArea) {
  return area.replace("_", " ");
}

function normalizeFocusAreas(values: string[]): PracticeFocusArea[] {
  const focusAreas = values.filter(isFocusArea);
  return focusAreas.length ? focusAreas : ["catching", "throwing", "teamwork"];
}

function normalizeHomeActivities(value: Json): ParentReplayHomeActivity[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const duration = item.duration;
    const title = item.title;
    const steps = item.steps;
    if (
      duration !== "30_seconds" &&
      duration !== "2_minutes" &&
      duration !== "5_minutes"
    ) return [];
    if (typeof title !== "string" || !Array.isArray(steps)) return [];
    return [{
      duration,
      title,
      coachCue: typeof item.coachCue === "string" ? item.coachCue : undefined,
      parentGoal: typeof item.parentGoal === "string" ? item.parentGoal : undefined,
      steps: steps.filter((step): step is string => typeof step === "string")
    }];
  });
}

function normalizeCoachVideo(value: Json): ParentReplayRecord["coachVideo"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { title: "Coach video library", url: "#", note: "No coach video attached yet." };
  }

  return {
    title: typeof value.title === "string" ? value.title : "Coach video library",
    url: typeof value.url === "string" ? value.url : "#",
    note: typeof value.note === "string" ? value.note : "No coach video attached yet."
  };
}

export async function listTeamPortalData(): Promise<TeamPortalData | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const [
      teamsResult,
      playersResult,
      guardianLinksResult,
      parentInvitesResult,
      teamMembershipsResult,
      profilesResult,
      eventsResult,
      mediaItemsResult,
      parentReplaysResult
    ] = await withSupabaseTimeout(Promise.all([
      supabase
        .from("teams")
        .select("id,organization_id,season_id,division,name,coach_user_id,mascot,primary_color,secondary_color,theme_key")
        .order("division", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("players")
        .select("id,organization_id,season_id,team_id,first_name,last_initial,jersey")
        .order("first_name", { ascending: true }),
      supabase
        .from("player_guardians")
        .select("id,player_id,parent_user_id,parent_invite_id,relationship,status")
        .order("created_at", { ascending: false }),
      supabase
        .from("parent_invites")
        .select("id,organization_id,team_id,player_id,email,phone,invite_token_hash,status,delivery_status,sent_count,resend_timestamps,last_sent_at,expires_at,accepted_at,created_at,updated_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("team_memberships")
        .select("id,team_id,user_id,role,status")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id,display_name,email,phone,default_role")
        .order("display_name", { ascending: true }),
      supabase
        .from("events")
        .select("id,organization_id,team_id,season_id,title,event_type,starts_at,ends_at,location_name,location_address,status,opponent,created_at,updated_at")
        .order("starts_at", { ascending: true }),
      supabase
        .from("media_items")
        .select("id,team_id,title,media_type,url,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("parent_replays")
        .select("id,organization_id,season_id,team_id,coach_user_id,focus_areas,title,summary,home_activities,coach_video,parent_tip,team_quest,skill_cards,parent_education,status,generated_at,created_at")
        .order("created_at", { ascending: false })
    ]), 7000);

    const results = [
      teamsResult,
      playersResult,
      guardianLinksResult,
      parentInvitesResult,
      teamMembershipsResult,
      profilesResult,
      eventsResult,
      mediaItemsResult,
      parentReplaysResult
    ];
    if (results.some((result) => result.error)) return null;
    if (!teamsResult.data?.length) return null;

    return {
      teams: teamsResult.data.map((team) => ({
        id: team.id,
        organizationId: team.organization_id,
        seasonId: team.season_id,
        division: team.division,
        name: team.name,
        coachUserId: team.coach_user_id ?? undefined,
        mascot: team.mascot,
        primaryColor: team.primary_color,
        secondaryColor: team.secondary_color,
        themeKey: team.theme_key
      })),
      players: (playersResult.data ?? []).map((player) => ({
        id: player.id,
        organizationId: player.organization_id,
        seasonId: player.season_id,
        teamId: player.team_id,
        firstName: player.first_name,
        lastInitial: player.last_initial,
        jersey: player.jersey ?? "TBD"
      })),
      guardianLinks: (guardianLinksResult.data ?? []).map((guardian) => ({
        id: guardian.id,
        playerId: guardian.player_id,
        parentUserId: guardian.parent_user_id ?? undefined,
        parentInviteId: guardian.parent_invite_id ?? undefined,
        relationship: guardian.relationship,
        status: guardian.status
      })),
      parentInvites: (parentInvitesResult.data ?? []).map((invite) => ({
        id: invite.id,
        organizationId: invite.organization_id,
        teamId: invite.team_id,
        playerId: invite.player_id,
        email: invite.email,
        phone: invite.phone ?? "",
        inviteTokenHash: invite.invite_token_hash,
        status: invite.status,
        deliveryStatus: invite.delivery_status,
        sentCount: invite.sent_count,
        resendTimestamps: invite.resend_timestamps,
        lastSentAt: invite.last_sent_at ?? undefined,
        expiresAt: invite.expires_at,
        acceptedAt: invite.accepted_at ?? undefined,
        createdAt: invite.created_at,
        updatedAt: invite.updated_at
      })),
      teamMemberships: (teamMembershipsResult.data ?? []).map((membership) => ({
        id: membership.id,
        teamId: membership.team_id,
        userId: membership.user_id,
        role: membership.role,
        status: membership.status
      })),
      users: (profilesResult.data ?? []).map((profile) => ({
        id: profile.id,
        role: profile.default_role,
        name: profile.display_name,
        email: profile.email,
        phone: profile.phone ?? undefined
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
      mediaItems: (mediaItemsResult.data ?? []).map((item) => ({
        id: item.id,
        teamId: item.team_id,
        title: item.title,
        type: item.media_type,
        url: item.url,
        createdAt: item.created_at
      })),
      parentReplays: (parentReplaysResult.data ?? []).map((replay) => ({
        id: replay.id,
        organizationId: replay.organization_id,
        seasonId: replay.season_id,
        teamId: replay.team_id,
        coachUserId: replay.coach_user_id,
        focusAreas: normalizeFocusAreas(replay.focus_areas),
        title: replay.title,
        summary: replay.summary,
        homeActivities: normalizeHomeActivities(replay.home_activities),
        parentTranslations: normalizeFocusAreas(replay.focus_areas).map((area) => ({
          coachTerm: formatFocusLabel(area),
          parentInstruction: parentTranslationInstructions[area]
        })),
        microCoachingStreak: {
          label: "Team home-practice streak",
          completedFamilies: 0,
          totalFamilies: 0,
          completionRate: 0
        },
        memoryMoment: {
          title: `${replay.title} memory`,
          detail: `Replay saved for ${normalizeFocusAreas(replay.focus_areas).map(formatFocusLabel).join(", ")}.`
        },
        coachVideo: normalizeCoachVideo(replay.coach_video),
        parentTip: replay.parent_tip,
        teamQuest: replay.team_quest,
        skillCards: replay.skill_cards,
        parentEducation: replay.parent_education,
        generatedAt: replay.generated_at,
        status: replay.status,
        createdAt: replay.created_at
      }))
    };
  } catch {
    return null;
  }
}
