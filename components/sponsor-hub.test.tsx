import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SponsorHub } from "@/components/sponsor-hub";
import { seedState } from "@/lib/domain";
import type { SponsorshipProgramSummary } from "@/lib/domain";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));

function programSummary(
  sponsorId: string,
  overrides: Partial<SponsorshipProgramSummary> = {}
): SponsorshipProgramSummary {
  return {
    sponsorId,
    sponsorName: "Sponsor",
    packageName: "Gold",
    agreementStatus: "active",
    invoiceCount: 1,
    latestInvoiceStatus: "issued",
    amountCents: 180_000,
    paidCents: 180_000,
    refundedCents: 0,
    disputedCents: 0,
    outstandingCents: 0,
    paymentState: "paid",
    fulfillmentState: "pending",
    requirements: [],
    deliverables: [],
    readyForPlacement: true,
    recapReady: false,
    agreementRecorded: true,
    proofBoundary: "Test program summary.",
    ...overrides
  };
}

describe("Sponsor Hub route and presentation", () => {
  it("keeps the focused route behind admin access and passes an authorized organization scope to the adapter", () => {
    const page = readFileSync(join(process.cwd(), "app", "admin", "sponsors", "page.tsx"), "utf8");

    expect(page).toContain("requireAdminPageAccess");
    expect(page).toContain("listSponsorAdminData");
    expect(page).toContain("adminOrganizationIds");
    expect(page).toContain("listSponsorAdminData({ organizationId })");
    expect(page).toContain("SponsorHub");
    expect(page).not.toContain("createSupabase");
  });

  it("renders verified revenue only from program summaries and ignores legacy billing rows", () => {
    const html = renderToStaticMarkup(<SponsorHub initialData={{
      organizationId: seedState.organization.id,
      teams: seedState.teams,
      sponsors: seedState.sponsors,
      billingRecords: [{
        id: "billing-1",
        sponsorId: seedState.sponsors[0]!.id,
        invoiceReference: "invoice-proof-1",
        amountCents: 250_000,
        currency: "usd",
        status: "payment_recorded",
        paymentProofStatus: "paid",
        confirmedAt: "2026-07-26T12:00:00.000Z"
      }, {
        id: "billing-2",
        sponsorId: seedState.sponsors[1]!.id,
        invoiceReference: "invoice-awaiting-2",
        amountCents: 100_000,
        currency: "usd",
        status: "invoice_ready",
        paymentProofStatus: "awaiting_invoice"
      }],
      programSummaries: [programSummary(seedState.sponsors[0]!.id)],
      programMessage: "Sponsor agreement, invoice, and delivery records are loaded from Supabase.",
      isSupabaseBacked: true,
      message: "Sponsor records and proof records are loaded from Supabase."
    }} />);

    expect(html).toContain("$1,800.00");
    expect(html).toContain("1 fully paid sponsor program");
    expect(html).not.toContain("$2,500.00");
    expect(html).not.toContain("$3,500.00");
  });

  it("shows awaiting-logo and awaiting-payment-proof sub-statuses per sponsor", () => {
    const [confirmedSponsor, awaitingSponsor] = seedState.sponsors;
    const html = renderToStaticMarkup(<SponsorHub initialData={{
      organizationId: seedState.organization.id,
      teams: seedState.teams,
      sponsors: [
        { ...confirmedSponsor!, logoUrl: "https://example.com/logo.png" },
        awaitingSponsor!
      ],
      billingRecords: [{
        id: "billing-1",
        sponsorId: confirmedSponsor!.id,
        invoiceReference: "invoice-proof-1",
        amountCents: 250_000,
        currency: "usd",
        status: "payment_recorded",
        paymentProofStatus: "paid",
        confirmedAt: "2026-07-26T12:00:00.000Z"
      }],
      programSummaries: [
        programSummary(confirmedSponsor!.id),
        programSummary(awaitingSponsor!.id, {
          latestInvoiceStatus: "issued",
          paidCents: 0,
          outstandingCents: 180_000,
          paymentState: "awaiting_payment",
          readyForPlacement: false
        })
      ],
      programMessage: "Sponsor agreement, invoice, and delivery records are loaded from Supabase.",
      isSupabaseBacked: true,
      message: "Sponsor records and proof records are loaded from Supabase."
    }} />);

    // The confirmed sponsor has a logo and settled payment: no waiting chips.
    // The second sponsor is missing both.
    expect(html).toContain("Awaiting logo");
    expect(html).toContain("Awaiting payment proof");
    expect((html.match(/Awaiting logo/g) ?? []).length).toBe(1);
    expect((html.match(/Awaiting payment proof/g) ?? []).length).toBe(1);
  });

  it("never claims a payment-proof gap when billing records are unavailable", () => {
    const html = renderToStaticMarkup(<SponsorHub initialData={{
      organizationId: seedState.organization.id,
      teams: seedState.teams,
      sponsors: seedState.sponsors,
      billingRecords: [],
      programSummaries: [],
      programMessage: "Sponsor agreement, invoice, and delivery records were not loaded. No payment or delivery state is claimed.",
      isSupabaseBacked: false,
      message: "Sponsor records could not be loaded safely."
    }} />);

    expect(html).not.toContain("Awaiting payment proof");
  });

  it("fails closed without editable seed rows when sponsor data is unavailable", () => {
    const html = renderToStaticMarkup(<SponsorHub initialData={{
      organizationId: "org-unavailable",
      teams: [],
      sponsors: [],
      billingRecords: [],
      programSummaries: [],
      programMessage: "Sponsor agreement, invoice, and delivery records were not loaded. No payment or delivery state is claimed.",
      isSupabaseBacked: false,
      message: "Sponsor records could not be loaded safely."
    }} />);

    expect(html).toContain("Sponsor data unavailable");
    expect(html).toContain("Payment proof is unavailable");
    expect(html).toContain("disabled");
    expect(html).not.toContain("Community Sports Clinic");
    expect(html).not.toContain("Corner Pizza");
  });

  it("keeps impact, renewal, logo-review, and child-data claims proof safe", () => {
    const component = readFileSync(join(process.cwd(), "components", "sponsor-hub.tsx"), "utf8");

    expect(component).toContain("No settled payment proof recorded");
    expect(component).toContain("Delivery proof");
    expect(component).toContain("Player and family data are never included");
    expect(component).toContain("Renewal email delivery is not connected");
    expect(component).toContain("Verified impact events");
    expect(component).toContain("New logo URL for review");
    expect(component).toContain("New logos remain pending until reviewed");
    expect(component).toContain("Download CSV");
    expect(component).not.toContain("createSupabaseBrowserClient");
  });
});
