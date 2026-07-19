import { NextResponse } from "next/server";
import { buildLeagueRevenueSummary, buildSponsorOpportunities, seedState } from "@/lib/domain";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireActiveOrganizationAdmin } from "@/lib/supabase/access-control";
import { listSponsorAdminData } from "@/lib/supabase/sponsors";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

type UnsafeSupabase = {
  // Admin revenue reads use staged membership tables; keep dynamic until generated types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export async function GET(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const sponsorData = await listSponsorAdminData();
  const organizationId = sponsorData.organizationId;
  const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
  const access = await requireActiveOrganizationAdmin({
    db,
    organizationId,
    userId: auth.user.id,
    action: "view league revenue"
  });

  if (!access.ok) {
    return NextResponse.json({ ok: false, message: access.message }, { status: 403 });
  }

  const state = {
    ...seedState,
    sponsors: sponsorData.sponsors,
    teams: sponsorData.teams.length ? sponsorData.teams : seedState.teams
  };

  return NextResponse.json({
    ok: true,
    message: "League revenue summary is an admin-only read model. Stripe settlement remains webhook-proof gated.",
    revenueSummary: buildLeagueRevenueSummary(state),
    sponsorOpportunities: buildSponsorOpportunities(state),
    isSupabaseBacked: sponsorData.isSupabaseBacked
  });
}
