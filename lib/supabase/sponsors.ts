import { seedState, type Sponsor, type Team, type User } from "@/lib/domain";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Sponsor V2 spans staged migrations; keep this dynamic until generated types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export interface SponsorAdminData {
  organizationId: string;
  teams: Team[];
  users: User[];
  sponsors: Sponsor[];
  isSupabaseBacked: boolean;
  message: string;
}

function fallbackSponsorData(message = "Showing local sponsor records until Supabase sponsor rows are available."): SponsorAdminData {
  return {
    organizationId: seedState.organization.id,
    teams: seedState.teams,
    users: seedState.users,
    sponsors: seedState.sponsors,
    isSupabaseBacked: false,
    message
  };
}

function adminDb() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

export async function listSponsorAdminData(): Promise<SponsorAdminData> {
  try {
    const db = adminDb();
    const [
      organizationsResult,
      teamsResult,
      profilesResult,
      sponsorsResult,
      placementsResult,
      assetsResult
    ] = await withSupabaseTimeout(Promise.all([
      db.from("organizations").select("id,name").order("created_at", { ascending: true }).limit(1),
      db.from("teams").select("id,organization_id,season_id,division,name,coach_user_id,mascot,primary_color,secondary_color,theme_key").order("division", { ascending: true }),
      db.from("profiles").select("id,display_name,email,phone,default_role").order("display_name", { ascending: true }),
      db.from("sponsors").select("id,organization_id,name,level,team_id,url,status").order("created_at", { ascending: false }),
      db.from("sponsor_placements").select("sponsor_id,placement_key,status").eq("status", "active"),
      db.from("sponsor_assets").select("sponsor_id,url,status").eq("asset_type", "logo").order("created_at", { ascending: false })
    ]), 7000);

    if (organizationsResult.error || teamsResult.error || profilesResult.error || sponsorsResult.error) {
      return fallbackSponsorData("Supabase sponsor rows are not available yet.");
    }

    const organization = organizationsResult.data?.[0];
    if (!organization) return fallbackSponsorData("Supabase organization rows are not available yet.");

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

    const users: User[] = (profilesResult.data ?? []).map((profile: {
      id: string;
      display_name: string;
      email: string;
      phone: string | null;
      default_role: User["role"];
    }) => ({
      id: profile.id,
      role: profile.default_role,
      name: profile.display_name,
      email: profile.email,
      phone: profile.phone ?? undefined
    }));

    const placementBySponsorId = new Map<string, Sponsor["placementKey"]>();
    for (const placement of placementsResult.data ?? []) {
      placementBySponsorId.set(placement.sponsor_id, placement.placement_key);
    }

    const logoBySponsorId = new Map<string, string>();
    for (const asset of assetsResult.data ?? []) {
      if (asset.url && asset.status !== "rejected" && !logoBySponsorId.has(asset.sponsor_id)) {
        logoBySponsorId.set(asset.sponsor_id, asset.url);
      }
    }

    const sponsors: Sponsor[] = (sponsorsResult.data ?? []).map((sponsor: {
      id: string;
      organization_id: string;
      name: string;
      level: Sponsor["level"];
      team_id: string | null;
      url: string;
      status: Sponsor["status"];
    }) => ({
      id: sponsor.id,
      organizationId: sponsor.organization_id,
      name: sponsor.name,
      level: sponsor.level,
      teamId: sponsor.team_id ?? undefined,
      url: sponsor.url,
      status: sponsor.status,
      placementKey: placementBySponsorId.get(sponsor.id),
      logoUrl: logoBySponsorId.get(sponsor.id)
    }));

    return {
      organizationId: organization.id,
      teams,
      users,
      sponsors,
      isSupabaseBacked: true,
      message: "Sponsor records, placements, and logo assets are loaded from Supabase."
    };
  } catch {
    return fallbackSponsorData("Supabase sponsor rows could not be loaded.");
  }
}
