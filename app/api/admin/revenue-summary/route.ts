import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireActiveOrganizationAdmin } from "@/lib/supabase/access-control";
import { listSponsorAdminData } from "@/lib/supabase/sponsors";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { withSupabaseTimeout } from "@/lib/supabase/timeout";

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

  const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
  const requestedOrganizationId = new URL(request.url).searchParams.get("organizationId")?.trim();
  let membershipQuery = db
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", auth.user.id)
    .eq("role", "admin")
    .eq("status", "active");
  if (requestedOrganizationId) {
    membershipQuery = membershipQuery.eq("organization_id", requestedOrganizationId);
  }
  const { data: memberships, error: membershipError } = await withSupabaseTimeout(
    membershipQuery.limit(1),
    7000
  ) as {
      data: Array<{ organization_id: string }> | null;
      error: { message?: string } | null;
    };
  const organizationId = memberships?.[0]?.organization_id;
  if (membershipError || !organizationId) {
    return NextResponse.json({ ok: false, message: "Active organization admin access is required." }, { status: 403 });
  }

  const access = await requireActiveOrganizationAdmin({
    db,
    organizationId,
    userId: auth.user.id,
    action: "view league revenue"
  });

  if (!access.ok) {
    return NextResponse.json({ ok: false, message: access.message }, { status: 403 });
  }

  const sponsorData = await listSponsorAdminData({ organizationId });
  if (!sponsorData.isSupabaseBacked) {
    return NextResponse.json({
      ok: false,
      message: sponsorData.message
    }, { status: 503 });
  }

  const { data: seasons, error: seasonError } = await withSupabaseTimeout(db
    .from("seasons")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("starts_at", { ascending: false })
    .limit(1), 7000) as {
      data: Array<{ id: string }> | null;
      error: { message?: string } | null;
    };
  const seasonId = seasons?.[0]?.id;
  if (seasonError || !seasonId) {
    return NextResponse.json({
      ok: false,
      message: "An active organization season is required before revenue records can be summarized."
    }, { status: 503 });
  }

  const invoiceRecords = sponsorData.billingRecords.filter((record) => record.status !== "draft");
  const confirmedPaymentRecords = sponsorData.billingRecords.filter((record) => (
    record.paymentProofStatus === "paid" && Boolean(record.confirmedAt)
  ));

  return NextResponse.json({
    ok: true,
    message: "League revenue summary is an organization-admin read model. Stripe settlement remains webhook-proof gated.",
    revenueSummary: {
      organizationId,
      seasonId,
      registrationFeeCents: null,
      teamDueCents: null,
      sponsorInvoiceCents: invoiceRecords.reduce((total, record) => total + record.amountCents, 0),
      confirmedSponsorPaymentCents: confirmedPaymentRecords.reduce((total, record) => total + record.amountCents, 0),
      unpaidFamilyBalanceCents: null,
      scholarshipCreditCents: null,
      activeSponsorCount: sponsorData.sponsors.filter((sponsor) => sponsor.status === "active").length,
      pendingSponsorCount: sponsorData.sponsors.filter((sponsor) => sponsor.status === "pending").length,
      renewalRiskCount: sponsorData.sponsors.filter((sponsor) => sponsor.status === "expired" || sponsor.status === "pending").length,
      proofBoundary: "Sponsor invoice totals come only from persisted non-draft billing records; confirmed payment totals also require paid proof and a provider-confirmed timestamp. Family fee and balance fields are unavailable in this sponsor read model and are returned as null."
    },
    sponsorOpportunities: [],
    sponsorOpportunityBoundary: "No opportunity suggestions are returned without organization-scoped schedule, registration, snack, and media evidence.",
    isSupabaseBacked: true
  });
}
