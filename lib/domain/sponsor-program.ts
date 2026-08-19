import type { Sponsor } from "./types";

export type SponsorshipAgreementStatus = "draft" | "sent" | "signed" | "active" | "expired" | "cancelled";
export type SponsorshipInvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "void" | "refunded";
export type SponsorPaymentEventKind = "PaymentSucceeded" | "PaymentFailed" | "RefundSucceeded" | "DisputeOpened";
export type FulfillmentRequirementKind =
  | "league_homepage_logo"
  | "sport_homepage_logo"
  | "team_page_logo"
  | "sponsor_directory"
  | "newsletter_placement"
  | "field_banner"
  | "season_recap";
export type FulfillmentRequirementStatus = "pending" | "ready" | "delivered" | "blocked";

export interface SponsorshipPackageBenefit {
  kind: FulfillmentRequirementKind;
  label: string;
  quantity: number;
}

export interface SponsorshipPackage {
  id: string;
  name: string;
  seasonId: string;
  amountCents: number;
  currency: "usd";
  benefits: SponsorshipPackageBenefit[];
}

export interface SponsorshipAgreement {
  id: string;
  sponsorId: string;
  packageId: string;
  organizationId: string;
  seasonId: string;
  status: SponsorshipAgreementStatus;
  startsAt?: string;
  endsAt?: string;
}

export interface SponsorshipInvoice {
  id: string;
  agreementId: string;
  invoiceNumber: string;
  amountCents: number;
  currency: "usd";
  status: SponsorshipInvoiceStatus;
  issuedAt?: string;
}

export interface SponsorPaymentLedgerEntry {
  id: string;
  invoiceId: string;
  kind: SponsorPaymentEventKind;
  amountCents: number;
  currency: "usd";
  provider: "stripe" | "manual";
  providerEventId?: string;
  occurredAt: string;
}

export interface FulfillmentRequirement {
  id: string;
  agreementId: string;
  kind: FulfillmentRequirementKind;
  label: string;
  requiredQuantity: number;
  deliveredQuantity: number;
  status: FulfillmentRequirementStatus;
}

export interface SponsorshipProgramInput {
  sponsor: Sponsor;
  package: SponsorshipPackage;
  agreement: SponsorshipAgreement;
  invoice: SponsorshipInvoice;
  ledgerEntries?: SponsorPaymentLedgerEntry[];
  fulfillmentRequirements?: FulfillmentRequirement[];
}

export interface SponsorshipProgramSummary {
  sponsorId: string;
  sponsorName: string;
  packageName: string;
  agreementStatus: SponsorshipAgreementStatus;
  invoiceStatus: SponsorshipInvoiceStatus;
  amountCents: number;
  paidCents: number;
  refundedCents: number;
  disputedCents: number;
  outstandingCents: number;
  paymentState: "not_invoiced" | "awaiting_payment" | "partially_paid" | "paid" | "refunded" | "disputed";
  fulfillmentState: "not_ready" | "pending" | "in_progress" | "fulfilled" | "blocked";
  requirements: FulfillmentRequirement[];
  readyForPlacement: boolean;
  recapReady: boolean;
  /**
   * False when no sponsorship agreement is persisted for this sponsor. Surfaces that read from
   * seed or local state must show "no agreement on record" rather than inventing a billing state.
   */
  agreementRecorded: boolean;
  proofBoundary: string;
}

const paidKinds = new Set<SponsorPaymentEventKind>(["PaymentSucceeded"]);

function sumLedger(entries: SponsorPaymentLedgerEntry[], kind: SponsorPaymentEventKind) {
  return entries
    .filter((entry) => entry.kind === kind)
    .reduce((total, entry) => total + Math.max(0, entry.amountCents), 0);
}

function invoicePaymentState(invoice: SponsorshipInvoice, ledgerEntries: SponsorPaymentLedgerEntry[]): SponsorshipProgramSummary["paymentState"] {
  const paidCents = ledgerEntries
    .filter((entry) => paidKinds.has(entry.kind))
    .reduce((total, entry) => total + Math.max(0, entry.amountCents), 0);
  const refundedCents = sumLedger(ledgerEntries, "RefundSucceeded");
  const disputedCents = sumLedger(ledgerEntries, "DisputeOpened");

  if (disputedCents > 0) return "disputed";
  if (refundedCents >= invoice.amountCents && invoice.amountCents > 0) return "refunded";
  if (invoice.status === "draft" || invoice.status === "void") return "not_invoiced";
  if (paidCents <= 0) return "awaiting_payment";
  if (paidCents < invoice.amountCents) return "partially_paid";
  return "paid";
}

function defaultRequirements(agreement: SponsorshipAgreement, sponsorshipPackage: SponsorshipPackage): FulfillmentRequirement[] {
  return sponsorshipPackage.benefits.map((benefit) => ({
    id: `${agreement.id}-${benefit.kind}`,
    agreementId: agreement.id,
    kind: benefit.kind,
    label: benefit.label,
    requiredQuantity: Math.max(1, benefit.quantity),
    deliveredQuantity: 0,
    status: "pending" as const
  }));
}

function fulfillmentState(requirements: FulfillmentRequirement[]): SponsorshipProgramSummary["fulfillmentState"] {
  if (!requirements.length) return "not_ready";
  if (requirements.some((requirement) => requirement.status === "blocked")) return "blocked";
  if (requirements.every((requirement) => requirement.status === "delivered" && requirement.deliveredQuantity >= requirement.requiredQuantity)) {
    return "fulfilled";
  }
  if (requirements.some((requirement) => requirement.deliveredQuantity > 0 || requirement.status === "ready")) return "in_progress";
  return "pending";
}

export function buildSponsorshipProgramSummary(input: SponsorshipProgramInput): SponsorshipProgramSummary {
  const ledgerEntries = input.ledgerEntries ?? [];
  const requirements = input.fulfillmentRequirements?.length
    ? input.fulfillmentRequirements
    : defaultRequirements(input.agreement, input.package);
  const paidCents = sumLedger(ledgerEntries, "PaymentSucceeded");
  const refundedCents = sumLedger(ledgerEntries, "RefundSucceeded");
  const disputedCents = sumLedger(ledgerEntries, "DisputeOpened");
  const paymentState = invoicePaymentState(input.invoice, ledgerEntries);
  const currentFulfillmentState = fulfillmentState(requirements);
  const outstandingCents = Math.max(0, input.invoice.amountCents - paidCents + refundedCents);

  return {
    sponsorId: input.sponsor.id,
    sponsorName: input.sponsor.name,
    packageName: input.package.name,
    agreementStatus: input.agreement.status,
    invoiceStatus: input.invoice.status,
    amountCents: input.invoice.amountCents,
    paidCents,
    refundedCents,
    disputedCents,
    outstandingCents,
    paymentState,
    fulfillmentState: currentFulfillmentState,
    requirements,
    readyForPlacement: input.agreement.status === "active" && paymentState === "paid" && currentFulfillmentState !== "blocked",
    recapReady: currentFulfillmentState === "fulfilled" && paymentState === "paid",
    agreementRecorded: true,
    proofBoundary: "LeaguePilot owns sponsor agreement, invoice, ledger, fulfillment, proof, and renewal state. Stripe or another processor supplies settlement evidence only; browser returns and raw provider event names are not the sponsor product source of truth."
  };
}

export interface SponsorProviderPaymentEvent {
  provider: "stripe";
  type: "checkout.session.completed" | "payment_intent.payment_failed" | "charge.refunded" | "charge.dispute.created";
  providerEventId: string;
  invoiceId: string;
  amountCents: number;
  currency: "usd";
  occurredAt: string;
  paid?: boolean;
}

export function normalizeSponsorProviderPaymentEvent(event: SponsorProviderPaymentEvent): SponsorPaymentLedgerEntry {
  const kindByType: Record<SponsorProviderPaymentEvent["type"], SponsorPaymentEventKind> = {
    "checkout.session.completed": event.paid === false ? "PaymentFailed" : "PaymentSucceeded",
    "payment_intent.payment_failed": "PaymentFailed",
    "charge.refunded": "RefundSucceeded",
    "charge.dispute.created": "DisputeOpened"
  };

  return {
    id: `${event.provider}:${event.providerEventId}`,
    invoiceId: event.invoiceId,
    kind: kindByType[event.type],
    amountCents: Math.max(0, event.amountCents),
    currency: event.currency,
    provider: event.provider,
    providerEventId: event.providerEventId,
    occurredAt: event.occurredAt
  };
}

/**
 * Persisted sponsor program records for one organization, as loaded by
 * `lib/supabase/sponsor-program.ts`. Every collection is optional so that seed-backed and
 * local-state surfaces can call the summariser with nothing but a sponsor list.
 */
export interface SponsorProgramRecords {
  packages?: SponsorshipPackage[];
  agreements?: SponsorshipAgreement[];
  invoices?: SponsorshipInvoice[];
  ledgerEntries?: SponsorPaymentLedgerEntry[];
  fulfillmentRequirements?: FulfillmentRequirement[];
}

const agreementRank: Record<SponsorshipAgreementStatus, number> = {
  active: 0,
  signed: 1,
  sent: 2,
  draft: 3,
  expired: 4,
  cancelled: 5
};

function selectAgreementForSponsor(sponsorId: string, agreements: SponsorshipAgreement[]) {
  return agreements
    .filter((agreement) => agreement.sponsorId === sponsorId)
    .sort((left, right) => agreementRank[left.status] - agreementRank[right.status])[0];
}

function selectInvoiceForAgreement(agreementId: string, invoices: SponsorshipInvoice[]) {
  return invoices.find((invoice) => invoice.agreementId === agreementId);
}

/**
 * The summary shown for a sponsor that has no persisted agreement. It reports absence rather than
 * a default: no amount is inferred, no payment state is assumed, and no placement or recap
 * readiness is claimed.
 */
function unrecordedProgramSummary(sponsor: Sponsor): SponsorshipProgramSummary {
  return {
    sponsorId: sponsor.id,
    sponsorName: sponsor.name,
    packageName: "No package on record",
    agreementStatus: "draft",
    invoiceStatus: "draft",
    amountCents: 0,
    paidCents: 0,
    refundedCents: 0,
    disputedCents: 0,
    outstandingCents: 0,
    paymentState: "not_invoiced",
    fulfillmentState: "not_ready",
    requirements: [],
    readyForPlacement: false,
    recapReady: false,
    agreementRecorded: false,
    proofBoundary: "No sponsorship agreement, invoice, or payment record exists for this sponsor. Nothing about amount, payment, placement delivery, or renewal is claimed."
  };
}

/**
 * Fold every sponsor in an organization into one program summary each, using whatever persisted
 * records are available. This is the single sponsor money vocabulary: it replaced
 * `buildSponsorBillingProofs`, which described the same facts with a second, incompatible set of
 * names.
 */
export function buildSponsorProgramSummaries(
  sponsors: Sponsor[],
  records: SponsorProgramRecords = {}
): SponsorshipProgramSummary[] {
  const packages = records.packages ?? [];
  const agreements = records.agreements ?? [];
  const invoices = records.invoices ?? [];
  const ledgerEntries = records.ledgerEntries ?? [];
  const fulfillmentRequirements = records.fulfillmentRequirements ?? [];

  return sponsors.map((sponsor) => {
    const agreement = selectAgreementForSponsor(sponsor.id, agreements);
    if (!agreement) return unrecordedProgramSummary(sponsor);

    const invoice = selectInvoiceForAgreement(agreement.id, invoices);
    if (!invoice) return unrecordedProgramSummary(sponsor);

    const sponsorshipPackage = packages.find((candidate) => candidate.id === agreement.packageId) ?? {
      id: agreement.packageId,
      name: "No package on record",
      seasonId: agreement.seasonId,
      amountCents: invoice.amountCents,
      currency: "usd" as const,
      benefits: []
    };

    return buildSponsorshipProgramSummary({
      sponsor,
      package: sponsorshipPackage,
      agreement,
      invoice,
      ledgerEntries: ledgerEntries.filter((entry) => entry.invoiceId === invoice.id),
      fulfillmentRequirements: fulfillmentRequirements.filter((requirement) => requirement.agreementId === agreement.id)
    });
  });
}

/**
 * Total invoiced value across an organization's sponsors. Sponsors with no persisted agreement
 * contribute zero; no amount is inferred from sponsor level, status, or name.
 */
export function sumSponsorInvoicedCents(summaries: SponsorshipProgramSummary[]) {
  return summaries.reduce((total, summary) => total + summary.amountCents, 0);
}

/** Plain-language label for a payment state, for use in admin and sponsor-facing surfaces. */
export function sponsorPaymentStateLabel(summary: SponsorshipProgramSummary) {
  if (!summary.agreementRecorded) return "No agreement on record";

  switch (summary.paymentState) {
    case "not_invoiced":
      return "No invoice issued";
    case "awaiting_payment":
      return "Awaiting payment";
    case "partially_paid":
      return "Partially paid";
    case "paid":
      return "Paid";
    case "refunded":
      return "Refunded";
    case "disputed":
      return "Payment disputed";
  }
}

/**
 * Security and proof guidance that must travel with the sponsor money vocabulary. These notes were
 * previously attached to each generated billing proof by the retired `lib/domain/sponsor-billing.ts`
 * (ADR 0003). They are constants rather than per-record strings because they describe the product
 * boundary, not any individual sponsor.
 */
export const SPONSOR_BILLING_SECURITY_NOTES = [
  "Use Stripe Products and Prices for sponsor packages; do not couple billing status to child-facing sponsor display.",
  "Use server-side Stripe calls only with environment-managed restricted keys; never expose Stripe secret keys to the browser.",
  "Record invoice and payment proof before activating paid sponsor billing claims."
] as const;

/**
 * The boundary statement for any surface that reports sponsor money. Paid, outstanding, refunded,
 * and disputed totals are folded from the append-only payment ledger; no balance is stored, and a
 * browser return is never settlement.
 */
export const SPONSOR_PROGRAM_PROOF_BOUNDARY =
  "LeaguePilot owns sponsor agreement, invoice, ledger, fulfillment, proof, and renewal state. Payment confirmation requires verified Stripe webhook evidence or an explicitly league-recorded manual payment. Browser return or public placement is not settlement.";
