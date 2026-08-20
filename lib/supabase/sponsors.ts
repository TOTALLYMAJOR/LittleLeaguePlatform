import type { Sponsor, SponsorshipProgramSummary, Team } from "@/lib/domain";
import { buildSponsorProgramSummaries } from "@/lib/domain";
import { createSupabaseAdminClient } from "./admin";
import { listSponsorProgramData } from "./sponsor-program";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Sponsor V2 spans staged migrations; keep this dynamic until generated types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export interface SponsorAdminData {
  organizationId: string;
  teams: Team[];
  sponsors: Sponsor[];
  billingRecords: SponsorBillingRecord[];
  /**
   * One program summary per sponsor, with deliverable state folded from evidence rather than read
   * from a column. Empty when program records are unavailable, so the hub reports absence instead
   * of inventing a delivery claim.
   */
  programSummaries: SponsorshipProgramSummary[];
  programMessage: string;
  isSupabaseBacked: boolean;
  message: string;
}

export interface SponsorBillingRecord {
  id: string;
  sponsorId: string;
  invoiceReference: string;
  amountCents: number;
  currency: "usd";
  status: "draft" | "invoice_ready" | "payment_recorded";
  paymentProofStatus: "not_requested" | "awaiting_invoice" | "paid";
  confirmedAt?: string;
}

function unavailableSponsorData(
  organizationId: string,
  message = "Sponsor records are unavailable for the selected organization. No preview rows are editable."
): SponsorAdminData {
  return {
    organizationId,
    teams: [],
    sponsors: [],
    billingRecords: [],
    programSummaries: [],
    programMessage: "Sponsor agreement, invoice, and delivery records were not loaded. No payment or delivery state is claimed.",
    isSupabaseBacked: false,
    message
  };
}

function adminDb() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

export async function listSponsorAdminData(input: {
  organizationId: string;
}): Promise<SponsorAdminData> {
  const organizationId = input.organizationId.trim();
  if (!organizationId) {
    return unavailableSponsorData("", "An authorized organization is required before sponsor records can be loaded.");
  }

  try {
    const db = adminDb();
    const [
      organizationsResult,
      teamsResult,
      sponsorsResult
    ] = await withSupabaseTimeout(Promise.all([
      db.from("organizations").select("id,name").eq("id", organizationId).maybeSingle(),
      db.from("teams")
        .select("id,organization_id,season_id,division,name,coach_user_id,mascot,primary_color,secondary_color,theme_key")
        .eq("organization_id", organizationId)
        .order("division", { ascending: true }),
      db.from("sponsors")
        .select("id,organization_id,name,level,team_id,url,status")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
    ]), 7000);

    if (organizationsResult.error || teamsResult.error || sponsorsResult.error) {
      return unavailableSponsorData(organizationId, "Supabase sponsor rows are not available for this organization.");
    }

    const organization = organizationsResult.data;
    if (!organization) {
      return unavailableSponsorData(organizationId, "The selected organization is not available.");
    }

    const sponsorIds = (sponsorsResult.data ?? []).map((sponsor: { id: string }) => sponsor.id);
    const emptyResult = Promise.resolve({ data: [], error: null });
    const [
      placementsResult,
      assetsResult,
      billingResult
    ] = await withSupabaseTimeout(Promise.all([
      sponsorIds.length
        ? db.from("sponsor_placements")
          .select("sponsor_id,placement_key,status,created_at")
          .eq("organization_id", organizationId)
          .in("sponsor_id", sponsorIds)
          .eq("status", "active")
          .order("created_at", { ascending: false })
        : emptyResult,
      sponsorIds.length
        ? db.from("sponsor_assets")
          .select("sponsor_id,url,status,created_at")
          .in("sponsor_id", sponsorIds)
          .eq("asset_type", "logo")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
        : emptyResult,
      sponsorIds.length
        ? db.from("sponsor_billing_records")
          .select("id,sponsor_id,invoice_reference,amount_cents,currency,status,payment_proof_status,confirmed_at")
          .eq("organization_id", organizationId)
          .in("sponsor_id", sponsorIds)
          .order("created_at", { ascending: false })
        : emptyResult
    ]), 7000);

    if (placementsResult.error || assetsResult.error || billingResult.error) {
      return unavailableSponsorData(
        organizationId,
        "Sponsor placement, reviewed-logo, or payment-proof records could not be loaded safely."
      );
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

    const placementBySponsorId = new Map<string, Sponsor["placementKey"]>();
    for (const placement of placementsResult.data ?? []) {
      if (!placementBySponsorId.has(placement.sponsor_id)) {
        placementBySponsorId.set(placement.sponsor_id, placement.placement_key);
      }
    }

    const logoBySponsorId = new Map<string, string>();
    for (const asset of assetsResult.data ?? []) {
      if (asset.url && !logoBySponsorId.has(asset.sponsor_id)) {
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

    const billingRecords: SponsorBillingRecord[] = (billingResult.data ?? []).map((record: {
      id: string;
      sponsor_id: string;
      invoice_reference: string;
      amount_cents: number;
      currency: "usd";
      status: SponsorBillingRecord["status"];
      payment_proof_status: SponsorBillingRecord["paymentProofStatus"];
      confirmed_at: string | null;
    }) => ({
      id: record.id,
      sponsorId: record.sponsor_id,
      invoiceReference: record.invoice_reference,
      amountCents: record.amount_cents,
      currency: record.currency,
      status: record.status,
      paymentProofStatus: record.payment_proof_status,
      confirmedAt: record.confirmed_at ?? undefined
    }));

    // Program records are loaded separately and folded here so the hub receives one derived view.
    // A degraded program read leaves the sponsor list intact with empty summaries rather than
    // failing the whole page.
    const programData = await listSponsorProgramData({ organizationId });
    const programSummaries = programData.isSupabaseBacked
      ? buildSponsorProgramSummaries(sponsors, programData)
      : [];

    return {
      organizationId: organization.id,
      teams,
      sponsors,
      billingRecords,
      programSummaries,
      programMessage: programData.message,
      isSupabaseBacked: true,
      message: "Sponsor records, active placements, approved logos, and payment-proof records are loaded from Supabase."
    };
  } catch {
    return unavailableSponsorData(organizationId, "Supabase sponsor records could not be loaded safely.");
  }
}
