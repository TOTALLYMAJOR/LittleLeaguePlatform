import { describe, expect, it } from "vitest";
import type {
  Sponsor,
  SponsorPaymentLedgerEntry,
  SponsorshipAgreement,
  SponsorshipInvoice,
  SponsorshipPackage
} from "../index";
import {
  buildSponsorProgramSummaries,
  buildSponsorshipProgramSummary,
  getBannerSponsorPlacement,
  getEmailSponsorPlacement,
  getMediaGallerySponsorPlacement,
  getScheduleSponsorPlacement,
  getSponsorPlacement,
  getTeamPortalSponsorPlacement,
  normalizeSponsorProviderPaymentEvent,
  sponsorPaymentStateLabel,
  sumSponsorInvoicedCents
} from "../index";

const NOW = "2026-08-19T12:00:00.000Z";

const sponsor: Sponsor = {
  id: "sponsor-1",
  organizationId: "org-1",
  name: "Corner Pizza",
  level: "league",
  url: "https://corner.example",
  status: "active",
  placementKey: "team_portal"
};

const sponsorshipPackage: SponsorshipPackage = {
  id: "package-gold",
  name: "Gold Sponsor",
  seasonId: "season-1",
  amountCents: 150_000,
  currency: "usd",
  benefits: [{ kind: "league_homepage_logo", label: "League homepage logo", quantity: 1 }]
};

const agreement: SponsorshipAgreement = {
  id: "agreement-1",
  sponsorId: sponsor.id,
  packageId: sponsorshipPackage.id,
  organizationId: "org-1",
  seasonId: "season-1",
  status: "active"
};

const invoice: SponsorshipInvoice = {
  id: "invoice-1",
  agreementId: agreement.id,
  invoiceNumber: "SP-2026-001",
  amountCents: 150_000,
  currency: "usd",
  status: "issued"
};

function ledgerEntry(
  kind: SponsorPaymentLedgerEntry["kind"],
  amountCents: number,
  providerEventId: string
): SponsorPaymentLedgerEntry {
  return {
    id: `entry-${providerEventId}`,
    invoiceId: invoice.id,
    kind,
    amountCents,
    currency: "usd",
    provider: "stripe",
    providerEventId,
    occurredAt: NOW
  };
}

function summaryFor(ledgerEntries: SponsorPaymentLedgerEntry[]) {
  return buildSponsorshipProgramSummary({
    sponsor,
    package: sponsorshipPackage,
    agreement,
    invoice,
    ledgerEntries
  });
}

describe("sponsor payment ledger folding", () => {
  it("reports paid with zero outstanding when the invoice is settled in full", () => {
    const summary = summaryFor([ledgerEntry("PaymentSucceeded", 150_000, "evt_1")]);

    expect(summary.paymentState).toBe("paid");
    expect(summary.paidCents).toBe(150_000);
    expect(summary.outstandingCents).toBe(0);
    expect(sponsorPaymentStateLabel(summary)).toBe("Paid");
  });

  it("reports partially paid and the exact remaining balance", () => {
    const summary = summaryFor([ledgerEntry("PaymentSucceeded", 60_000, "evt_1")]);

    expect(summary.paymentState).toBe("partially_paid");
    expect(summary.outstandingCents).toBe(90_000);
  });

  it("lets a dispute override a fully paid invoice", () => {
    const summary = summaryFor([
      ledgerEntry("PaymentSucceeded", 150_000, "evt_1"),
      ledgerEntry("DisputeOpened", 150_000, "evt_2")
    ]);

    expect(summary.paymentState).toBe("disputed");
    expect(summary.readyForPlacement).toBe(false);
    expect(sponsorPaymentStateLabel(summary)).toBe("Payment disputed");
  });

  it("returns a full refund to a refunded state rather than leaving it paid", () => {
    const summary = summaryFor([
      ledgerEntry("PaymentSucceeded", 150_000, "evt_1"),
      ledgerEntry("RefundSucceeded", 150_000, "evt_2")
    ]);

    expect(summary.paymentState).toBe("refunded");
    expect(summary.outstandingCents).toBe(150_000);
  });

  it("returns a partial refund to partially paid and disables placement readiness", () => {
    const summary = summaryFor([
      ledgerEntry("PaymentSucceeded", 150_000, "evt_paid"),
      ledgerEntry("RefundSucceeded", 10_000, "evt_partial_refund")
    ]);

    expect(summary.paymentState).toBe("partially_paid");
    expect(summary.outstandingCents).toBe(10_000);
    expect(summary.readyForPlacement).toBe(false);
  });

  it("ignores failed payments when folding the paid total", () => {
    const summary = summaryFor([
      ledgerEntry("PaymentFailed", 150_000, "evt_1"),
      ledgerEntry("PaymentSucceeded", 150_000, "evt_2")
    ]);

    expect(summary.paidCents).toBe(150_000);
    expect(summary.paymentState).toBe("paid");
  });

  it("folds to the same state regardless of the order entries arrive in", () => {
    const entries = [
      ledgerEntry("PaymentSucceeded", 50_000, "evt_1"),
      ledgerEntry("PaymentFailed", 20_000, "evt_2"),
      ledgerEntry("PaymentSucceeded", 40_000, "evt_3"),
      ledgerEntry("RefundSucceeded", 10_000, "evt_4")
    ];

    // A processor delivers events out of order routinely. Every permutation must fold identically,
    // because the summary is a fold over a set and not a state machine driven by arrival order.
    const permutations = [
      [0, 1, 2, 3],
      [3, 2, 1, 0],
      [2, 0, 3, 1],
      [1, 3, 0, 2]
    ].map((order) => order.map((index) => entries[index]!));

    const folded = permutations.map((permutation) => {
      const summary = summaryFor(permutation);
      return {
        paidCents: summary.paidCents,
        refundedCents: summary.refundedCents,
        outstandingCents: summary.outstandingCents,
        paymentState: summary.paymentState
      };
    });

    for (const result of folded) {
      expect(result).toEqual(folded[0]);
    }
    expect(folded[0]).toEqual({
      paidCents: 90_000,
      refundedCents: 10_000,
      outstandingCents: 70_000,
      paymentState: "partially_paid"
    });
  });

  it("normalizes every supported processor event into an internal ledger kind", () => {
    const base = {
      provider: "stripe" as const,
      providerEventId: "evt_x",
      invoiceId: invoice.id,
      amountCents: 1000,
      currency: "usd" as const,
      occurredAt: NOW
    };

    expect(normalizeSponsorProviderPaymentEvent({ ...base, type: "checkout.session.completed", paid: true }).kind)
      .toBe("PaymentSucceeded");
    expect(normalizeSponsorProviderPaymentEvent({ ...base, type: "checkout.session.completed", paid: false }).kind)
      .toBe("PaymentFailed");
    expect(normalizeSponsorProviderPaymentEvent({ ...base, type: "payment_intent.payment_failed" }).kind)
      .toBe("PaymentFailed");
    expect(normalizeSponsorProviderPaymentEvent({ ...base, type: "refund.created", providerResourceId: "refund:re_1" }).kind)
      .toBe("RefundSucceeded");
    expect(normalizeSponsorProviderPaymentEvent({ ...base, type: "refund.updated", providerResourceId: "refund:re_1" }).providerResourceId)
      .toBe("refund:re_1");
    expect(normalizeSponsorProviderPaymentEvent({ ...base, type: "charge.dispute.created" }).kind)
      .toBe("DisputeOpened");
  });
});

describe("sponsor program summaries without persisted records", () => {
  it("reports absence rather than inventing a billing state", () => {
    const [summary] = buildSponsorProgramSummaries([sponsor]);

    expect(summary?.agreementRecorded).toBe(false);
    expect(summary?.amountCents).toBe(0);
    expect(summary?.paymentState).toBe("not_invoiced");
    expect(summary?.readyForPlacement).toBe(false);
    expect(summary?.recapReady).toBe(false);
    expect(summary?.requirements).toEqual([]);
    expect(sponsorPaymentStateLabel(summary!)).toBe("No agreement on record");
    expect(sumSponsorInvoicedCents([summary!])).toBe(0);
  });

  it("uses persisted records when they exist", () => {
    const [summary] = buildSponsorProgramSummaries([sponsor], {
      packages: [sponsorshipPackage],
      agreements: [agreement],
      invoices: [invoice],
      ledgerEntries: [ledgerEntry("PaymentSucceeded", 150_000, "evt_1")]
    });

    expect(summary?.agreementRecorded).toBe(true);
    expect(summary?.packageName).toBe("Gold Sponsor");
    expect(summary?.paymentState).toBe("paid");
    expect(sumSponsorInvoicedCents([summary!])).toBe(150_000);
  });

  it("aggregates every invoice on the selected agreement and exposes latest invoice status", () => {
    const latestInvoice: SponsorshipInvoice = {
      ...invoice,
      id: "invoice-2",
      invoiceNumber: "SP-2026-002",
      amountCents: 50_000,
      status: "issued"
    };
    const [summary] = buildSponsorProgramSummaries([sponsor], {
      packages: [sponsorshipPackage],
      agreements: [agreement],
      // Adapter order is newest-first.
      invoices: [latestInvoice, invoice],
      ledgerEntries: [
        ledgerEntry("PaymentSucceeded", 150_000, "evt_invoice_1"),
        { ...ledgerEntry("PaymentSucceeded", 25_000, "evt_invoice_2"), invoiceId: latestInvoice.id }
      ]
    });

    expect(summary).toMatchObject({
      invoiceCount: 2,
      latestInvoiceStatus: "issued",
      amountCents: 200_000,
      paidCents: 175_000,
      outstandingCents: 25_000,
      paymentState: "partially_paid",
      readyForPlacement: false
    });
  });

  it("treats an agreement with no invoice as unrecorded rather than as a zero-value deal", () => {
    const [summary] = buildSponsorProgramSummaries([sponsor], {
      packages: [sponsorshipPackage],
      agreements: [agreement]
    });

    expect(summary?.agreementRecorded).toBe(false);
    expect(summary?.paymentState).toBe("not_invoiced");
  });

  it("prefers an active agreement over a cancelled or expired one for the same sponsor", () => {
    const [summary] = buildSponsorProgramSummaries([sponsor], {
      packages: [sponsorshipPackage],
      agreements: [
        { ...agreement, id: "agreement-old", status: "expired" },
        agreement
      ],
      invoices: [invoice]
    });

    expect(summary?.agreementStatus).toBe("active");
  });
});

describe("public sponsor placement output is unchanged by the program spine", () => {
  // Migration 20260819161500 moves deal state onto sponsorship_agreements but changes neither the
  // sponsors.status constraint nor any stored value. These six helpers still read sponsors.status,
  // so their output must be byte-identical. This is the regression guard for that promise.
  const fixture: Sponsor[] = [
    { ...sponsor, id: "s-active-portal", placementKey: "team_portal", status: "active" },
    { ...sponsor, id: "s-active-portal-team", placementKey: "team_portal", status: "active", teamId: "team-1" },
    { ...sponsor, id: "s-pending-portal", placementKey: "team_portal", status: "pending" },
    { ...sponsor, id: "s-expired-portal", placementKey: "team_portal", status: "expired" },
    { ...sponsor, id: "s-active-digest", placementKey: "weekly_digest", status: "active" },
    { ...sponsor, id: "s-active-field", placementKey: "field_map", status: "active" },
    { ...sponsor, id: "s-active-registration", placementKey: "registration", status: "active" },
    { ...sponsor, id: "s-active-no-placement", placementKey: undefined, status: "active" }
  ];

  const expected = {
    teamPortalForTeam1: ["s-active-portal", "s-active-portal-team"],
    teamPortalForTeam2: ["s-active-portal"],
    schedule: ["s-active-digest"],
    mediaGallery: ["s-active-field"],
    email: ["s-active-digest"],
    banner: ["s-active-registration"],
    rawTeamPortal: ["s-active-portal", "s-active-portal-team"]
  };

  it("returns exactly the recorded placement sets", () => {
    expect(getTeamPortalSponsorPlacement(fixture, "team-1").map((entry) => entry.id))
      .toEqual(expected.teamPortalForTeam1);
    expect(getTeamPortalSponsorPlacement(fixture, "team-2").map((entry) => entry.id))
      .toEqual(expected.teamPortalForTeam2);
    expect(getScheduleSponsorPlacement(fixture).map((entry) => entry.id)).toEqual(expected.schedule);
    expect(getMediaGallerySponsorPlacement(fixture).map((entry) => entry.id)).toEqual(expected.mediaGallery);
    expect(getEmailSponsorPlacement(fixture).map((entry) => entry.id)).toEqual(expected.email);
    expect(getBannerSponsorPlacement(fixture).map((entry) => entry.id)).toEqual(expected.banner);
    expect(getSponsorPlacement(fixture, "team_portal").map((entry) => entry.id)).toEqual(expected.rawTeamPortal);
  });

  it("never exposes a pending or expired sponsor through any placement helper", () => {
    const everyPlacement = [
      ...getTeamPortalSponsorPlacement(fixture, "team-1"),
      ...getScheduleSponsorPlacement(fixture),
      ...getMediaGallerySponsorPlacement(fixture),
      ...getEmailSponsorPlacement(fixture),
      ...getBannerSponsorPlacement(fixture)
    ];

    expect(everyPlacement.every((entry) => entry.status === "active")).toBe(true);
    expect(everyPlacement.map((entry) => entry.id)).not.toContain("s-pending-portal");
    expect(everyPlacement.map((entry) => entry.id)).not.toContain("s-expired-portal");
  });

  it("keeps placement eligibility independent of payment state", () => {
    const unpaid = buildSponsorProgramSummaries(fixture)[0]!;

    expect(unpaid.paymentState).toBe("not_invoiced");
    // A sponsor with no payment record still renders publicly if the league marked them active.
    // Placement and settlement are deliberately separate concerns.
    expect(getTeamPortalSponsorPlacement(fixture, "team-1").map((entry) => entry.id))
      .toEqual(expected.teamPortalForTeam1);
  });
});
