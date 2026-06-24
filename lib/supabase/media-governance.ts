import { seedState, type MediaItem, type Team } from "@/lib/domain";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Media governance uses staged columns until generated types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export interface MediaGovernanceData {
  teams: Team[];
  mediaItems: MediaItem[];
  isSupabaseBacked: boolean;
  message: string;
}

function fallbackMediaGovernanceData(message = "Showing local media records until Supabase media rows are available."): MediaGovernanceData {
  return {
    teams: seedState.teams,
    mediaItems: seedState.mediaItems,
    isSupabaseBacked: false,
    message
  };
}

function adminDb() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

export async function listMediaGovernanceData(): Promise<MediaGovernanceData> {
  try {
    const db = adminDb();
    const [teamsResult, mediaResult] = await withSupabaseTimeout(Promise.all([
      db.from("teams").select("id,organization_id,season_id,division,name,coach_user_id,mascot,primary_color,secondary_color,theme_key").order("division", { ascending: true }),
      db.from("media_items").select("id,team_id,title,media_type,url,moderation_status,visibility,report_count,created_at").order("created_at", { ascending: false })
    ]), 7000);

    if (teamsResult.error || mediaResult.error) {
      return fallbackMediaGovernanceData("Supabase media governance rows are not available yet.");
    }

    const teams: Team[] = (teamsResult.data ?? []).map((team: {
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
    }) => ({
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
    }));

    const mediaItems: MediaItem[] = (mediaResult.data ?? []).map((item: {
      id: string;
      team_id: string;
      title: string;
      media_type: MediaItem["type"];
      url: string;
      moderation_status: MediaItem["moderationStatus"];
      visibility: MediaItem["visibility"] | null;
      report_count: number;
      created_at: string;
    }) => ({
      id: item.id,
      teamId: item.team_id,
      title: item.title,
      type: item.media_type,
      url: item.url,
      moderationStatus: item.moderation_status,
      visibility: item.visibility ?? "team",
      reportCount: item.report_count ?? 0,
      createdAt: item.created_at
    }));

    return {
      teams,
      mediaItems,
      isSupabaseBacked: true,
      message: "Media governance rows, report counts, status, and visibility are loaded from Supabase."
    };
  } catch {
    return fallbackMediaGovernanceData("Supabase media governance rows could not be loaded.");
  }
}
