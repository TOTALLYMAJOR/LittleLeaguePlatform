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
/**
 * Deliverable state is derived, never stored. No column in `sponsor_fulfillment_requirements` or
 * anywhere else holds one of these values (ADR 0003): they are folded from a requirement, the
 * placements that could carry it, and the evidence rows that observed it.
 */
export const SPONSOR_DELIVERABLE_STATES = [
  "not_started",
  "awaiting_assets",
  "scheduled",
  "delivered",
  "blocked"
] as const;
export type SponsorDeliverableState = (typeof SPONSOR_DELIVERABLE_STATES)[number];

export type SponsorFulfillmentEvidenceKind =
  | "screenshot"
  | "link"
  | "event_recap"
  | "attendance_summary"
  | "campaign_note";

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
  /** Stable provider object id, such as a Stripe refund or dispute id. */
  providerResourceId?: string;
  occurredAt: string;
}

/**
 * One benefit a package promised, as persisted. There is deliberately no delivered count and no
 * state: both are read from evidence. `blockedAt` is the single exception, because a block is a
 * human assertion that the benefit cannot run, not an observation the system can make.
 */
export interface FulfillmentRequirement {
  id: string;
  agreementId: string;
  kind: FulfillmentRequirementKind;
  label: string;
  requiredQuantity: number;
  blockedAt?: string;
  blockedReason?: string;
}

/** An observation that a promised benefit actually ran. */
export interface SponsorFulfillmentEvidence {
  id: string;
  requirementId: string;
  kind: SponsorFulfillmentEvidenceKind;
  observedAt: string;
  artifactUrl?: string;
  note?: string;
  capturedByUserId?: string;
}

/**
 * A sponsor placement row, reduced to what delivery derivation needs. `placementKey` reuses the
 * five-value taxonomy fixed by `0002_platform_hardening.sql`; this feature adds no new key.
 */
export interface SponsorPlacementWindow {
  sponsorId: string;
  placementKey: string;
  status: "active" | "paused" | "expired";
  startsAt?: string;
  endsAt?: string;
}

/** A requirement folded together with the evidence that does or does not prove it. */
export interface SponsorDeliverable {
  requirement: FulfillmentRequirement;
  state: SponsorDeliverableState;
  evidence: SponsorFulfillmentEvidence[];
  deliveredQuantity: number;
  deliveredAt?: string;
}

export interface SponsorshipProgramInput {
  sponsor: Sponsor;
  package: SponsorshipPackage;
  agreement: SponsorshipAgreement;
  invoice: SponsorshipInvoice;
  ledgerEntries?: SponsorPaymentLedgerEntry[];
  fulfillmentRequirements?: FulfillmentRequirement[];
  fulfillmentEvidence?: SponsorFulfillmentEvidence[];
  placements?: SponsorPlacementWindow[];
  /** True only when a reviewed, approved logo asset exists for this sponsor. */
  artworkApproved?: boolean;
  /** Injected clock for placement-window comparison; defaults to the current time. */
  now?: string;
}

export interface SponsorshipProgramSummary {
  sponsorId: string;
  sponsorName: string;
  packageName: string;
  agreementStatus: SponsorshipAgreementStatus;
  invoiceCount: number;
  latestInvoiceStatus: SponsorshipInvoiceStatus;
  amountCents: number;
  paidCents: number;
  refundedCents: number;
  disputedCents: number;
  outstandingCents: number;
  paymentState: "not_invoiced" | "awaiting_payment" | "partially_paid" | "paid" | "refunded" | "disputed";
  fulfillmentState: "not_ready" | "pending" | "in_progress" | "fulfilled" | "blocked";
  requirements: FulfillmentRequirement[];
  deliverables: SponsorDeliverable[];
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
  const netPaidCents = Math.max(0, paidCents - refundedCents);

  if (disputedCents > 0) return "disputed";
  if (paidCents > 0 && refundedCents >= paidCents) return "refunded";
  if (invoice.status === "draft" || invoice.status === "void") return "not_invoiced";
  if (netPaidCents <= 0) return "awaiting_payment";
  if (netPaidCents < invoice.amountCents) return "partially_paid";
  return "paid";
}

function defaultRequirements(agreement: SponsorshipAgreement, sponsorshipPackage: SponsorshipPackage): FulfillmentRequirement[] {
  return sponsorshipPackage.benefits.map((benefit) => ({
    id: `${agreement.id}-${benefit.kind}`,
    agreementId: agreement.id,
    kind: benefit.kind,
    label: benefit.label,
    requiredQuantity: Math.max(1, benefit.quantity)
  }));
}

/**
 * Which existing placement surface can carry each promised benefit. The five placement keys are
 * fixed by `0002_platform_hardening.sql` and this feature adds none: a benefit that has no surface
 * in that taxonomy simply never reaches `scheduled` from a placement, and depends entirely on
 * evidence.
 *
 * `league_homepage_logo` and `sport_homepage_logo` are exactly that case and map to null. Pointing
 * them at `team_portal` would have let one active team-portal placement report three distinct
 * promised surfaces as scheduled, which is a claim about a league homepage nobody made.
 */
const placementKeyByRequirementKind: Record<FulfillmentRequirementKind, string | null> = {
  league_homepage_logo: null,
  sport_homepage_logo: null,
  team_page_logo: "team_portal",
  sponsor_directory: "registration",
  newsletter_placement: "weekly_digest",
  field_banner: "field_map",
  season_recap: "storybook"
};

/**
 * Benefits that cannot run until a reviewed logo exists. A newsletter mention or a written recap
 * can proceed without artwork; a logo placement or a printed banner cannot.
 */
const artworkDependentRequirementKinds = new Set<FulfillmentRequirementKind>([
  "league_homepage_logo",
  "sport_homepage_logo",
  "team_page_logo",
  "sponsor_directory",
  "field_banner"
]);

function placementWindowIsOpen(placement: SponsorPlacementWindow, nowMs: number) {
  if (placement.status !== "active") return false;

  const startsAtMs = placement.startsAt ? Date.parse(placement.startsAt) : Number.NaN;
  if (Number.isFinite(startsAtMs) && startsAtMs > nowMs) return false;

  const endsAtMs = placement.endsAt ? Date.parse(placement.endsAt) : Number.NaN;
  if (Number.isFinite(endsAtMs) && endsAtMs < nowMs) return false;

  return true;
}

/**
 * Fold one requirement, the placements that could carry it, and the evidence that observed it into
 * a single deliverable state.
 *
 * `delivered` is returned from exactly one branch, and that branch requires a non-empty evidence
 * list. That is the whole point of the function: there is no column to set and no other path to
 * the word, so a deliverable cannot claim delivery the league cannot show.
 */
export function deriveDeliverableState(
  requirement: FulfillmentRequirement,
  placements: SponsorPlacementWindow[],
  evidence: SponsorFulfillmentEvidence[],
  context: { artworkApproved?: boolean; now?: string } = {}
): SponsorDeliverableState {
  if (requirement.blockedAt) return "blocked";

  const requirementEvidence = evidence.filter((entry) => entry.requirementId === requirement.id);
  if (requirementEvidence.length > 0) return "delivered";

  if (artworkDependentRequirementKinds.has(requirement.kind) && !context.artworkApproved) {
    return "awaiting_assets";
  }

  const nowMs = context.now ? Date.parse(context.now) : Date.now();
  const surfaceKey = placementKeyByRequirementKind[requirement.kind];
  const scheduled = surfaceKey !== null && placements.some((placement) => (
    placement.placementKey === surfaceKey && placementWindowIsOpen(placement, Number.isFinite(nowMs) ? nowMs : Date.now())
  ));

  return scheduled ? "scheduled" : "not_started";
}

/** Fold every requirement on an agreement into a deliverable, preserving the requirement order. */
export function deriveSponsorDeliverables(
  requirements: FulfillmentRequirement[],
  placements: SponsorPlacementWindow[] = [],
  evidence: SponsorFulfillmentEvidence[] = [],
  context: { artworkApproved?: boolean; now?: string } = {}
): SponsorDeliverable[] {
  return requirements.map((requirement) => {
    const requirementEvidence = evidence
      .filter((entry) => entry.requirementId === requirement.id)
      // Ordered by observation, with an id tiebreak so two observations recorded for the same
      // moment still list in one stable order.
      .sort((left, right) => (
        left.observedAt === right.observedAt
          ? left.id.localeCompare(right.id)
          : left.observedAt.localeCompare(right.observedAt)
      ));
    const state = deriveDeliverableState(requirement, placements, requirementEvidence, context);

    return {
      requirement,
      state,
      evidence: requirementEvidence,
      deliveredQuantity: requirementEvidence.length,
      deliveredAt: state === "delivered" ? requirementEvidence[0]?.observedAt : undefined
    };
  });
}

function fulfillmentState(deliverables: SponsorDeliverable[]): SponsorshipProgramSummary["fulfillmentState"] {
  if (!deliverables.length) return "not_ready";
  if (deliverables.some((deliverable) => deliverable.state === "blocked")) return "blocked";
  if (deliverables.every((deliverable) => (
    deliverable.state === "delivered" && deliverable.deliveredQuantity >= deliverable.requirement.requiredQuantity
  ))) {
    return "fulfilled";
  }
  if (deliverables.some((deliverable) => deliverable.state === "delivered" || deliverable.state === "scheduled")) {
    return "in_progress";
  }
  return "pending";
}

export function buildSponsorshipProgramSummary(input: SponsorshipProgramInput): SponsorshipProgramSummary {
  const ledgerEntries = input.ledgerEntries ?? [];
  const requirements = input.fulfillmentRequirements?.length
    ? input.fulfillmentRequirements
    : defaultRequirements(input.agreement, input.package);
  const deliverables = deriveSponsorDeliverables(
    requirements,
    input.placements?.filter((placement) => placement.sponsorId === input.sponsor.id) ?? [],
    input.fulfillmentEvidence ?? [],
    { artworkApproved: input.artworkApproved, now: input.now }
  );
  const paidCents = sumLedger(ledgerEntries, "PaymentSucceeded");
  const refundedCents = sumLedger(ledgerEntries, "RefundSucceeded");
  const disputedCents = sumLedger(ledgerEntries, "DisputeOpened");
  const paymentState = invoicePaymentState(input.invoice, ledgerEntries);
  const currentFulfillmentState = fulfillmentState(deliverables);
  const outstandingCents = Math.max(0, input.invoice.amountCents - Math.max(0, paidCents - refundedCents));

  return {
    sponsorId: input.sponsor.id,
    sponsorName: input.sponsor.name,
    packageName: input.package.name,
    agreementStatus: input.agreement.status,
    invoiceCount: 1,
    latestInvoiceStatus: input.invoice.status,
    amountCents: input.invoice.amountCents,
    paidCents,
    refundedCents,
    disputedCents,
    outstandingCents,
    paymentState,
    fulfillmentState: currentFulfillmentState,
    requirements,
    deliverables,
    readyForPlacement: input.agreement.status === "active" && paymentState === "paid" && currentFulfillmentState !== "blocked",
    recapReady: currentFulfillmentState === "fulfilled" && paymentState === "paid",
    agreementRecorded: true,
    proofBoundary: "LeaguePilot owns sponsor agreement, invoice, ledger, fulfillment, proof, and renewal state. Stripe or another processor supplies settlement evidence only; browser returns and raw provider event names are not the sponsor product source of truth."
  };
}

export interface SponsorProviderPaymentEvent {
  provider: "stripe";
  type: "checkout.session.completed" | "payment_intent.payment_failed" | "refund.created" | "refund.updated" | "charge.dispute.created";
  providerEventId: string;
  providerResourceId?: string;
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
    "refund.created": "RefundSucceeded",
    "refund.updated": "RefundSucceeded",
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
    providerResourceId: event.providerResourceId,
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
  fulfillmentEvidence?: SponsorFulfillmentEvidence[];
  placements?: SponsorPlacementWindow[];
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
    invoiceCount: 0,
    latestInvoiceStatus: "draft",
    amountCents: 0,
    paidCents: 0,
    refundedCents: 0,
    disputedCents: 0,
    outstandingCents: 0,
    paymentState: "not_invoiced",
    fulfillmentState: "not_ready",
    requirements: [],
    deliverables: [],
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
  records: SponsorProgramRecords = {},
  options: { now?: string } = {}
): SponsorshipProgramSummary[] {
  const packages = records.packages ?? [];
  const agreements = records.agreements ?? [];
  const invoices = records.invoices ?? [];
  const ledgerEntries = records.ledgerEntries ?? [];
  const fulfillmentRequirements = records.fulfillmentRequirements ?? [];
  const fulfillmentEvidence = records.fulfillmentEvidence ?? [];
  const placements = records.placements ?? [];

  return sponsors.map((sponsor) => {
    const agreement = selectAgreementForSponsor(sponsor.id, agreements);
    if (!agreement) return unrecordedProgramSummary(sponsor);

    // The adapter orders invoices newest-first. Preserve that order so the first row remains the
    // latest status while money truth is folded across every invoice on the selected agreement.
    const agreementInvoices = invoices.filter((invoice) => invoice.agreementId === agreement.id);
    const latestInvoice = agreementInvoices[0];
    if (!latestInvoice) return unrecordedProgramSummary(sponsor);

    const sponsorshipPackage = packages.find((candidate) => candidate.id === agreement.packageId) ?? {
      id: agreement.packageId,
      name: "No package on record",
      seasonId: agreement.seasonId,
      amountCents: agreementInvoices.reduce((total, invoice) => (
        invoice.status === "void" ? total : total + invoice.amountCents
      ), 0),
      currency: "usd" as const,
      benefits: []
    };

    const requirements = fulfillmentRequirements.filter((requirement) => requirement.agreementId === agreement.id);
    const requirementIds = new Set(requirements.map((requirement) => requirement.id));

    const invoiceIds = new Set(agreementInvoices.map((invoice) => invoice.id));
    const summary = buildSponsorshipProgramSummary({
      sponsor,
      package: sponsorshipPackage,
      agreement,
      invoice: {
        ...latestInvoice,
        amountCents: agreementInvoices.reduce((total, invoice) => (
          invoice.status === "void" ? total : total + invoice.amountCents
        ), 0),
        status: agreementInvoices.some((invoice) => invoice.status !== "draft" && invoice.status !== "void")
          ? latestInvoice.status === "draft" || latestInvoice.status === "void" ? "issued" : latestInvoice.status
          : latestInvoice.status
      },
      ledgerEntries: ledgerEntries.filter((entry) => invoiceIds.has(entry.invoiceId)),
      fulfillmentRequirements: requirements,
      fulfillmentEvidence: fulfillmentEvidence.filter((entry) => requirementIds.has(entry.requirementId)),
      placements: placements.filter((placement) => placement.sponsorId === sponsor.id),
      // `logoUrl` is only ever populated from an approved sponsor asset by the adapter, so its
      // presence is the artwork-approval signal rather than a second read.
      artworkApproved: Boolean(sponsor.logoUrl),
      now: options.now
    });

    return {
      ...summary,
      invoiceCount: agreementInvoices.length,
      latestInvoiceStatus: latestInvoice.status
    };
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
 * Plain-language label for a derived deliverable state. `scheduled` and `delivered` are worded so
 * they cannot be misread as each other: a placement being arranged is not proof it ran.
 */
export function sponsorDeliverableStateLabel(state: SponsorDeliverableState) {
  switch (state) {
    case "not_started":
      return "Not started";
    case "awaiting_assets":
      return "Awaiting artwork";
    case "scheduled":
      return "Scheduled, not yet proven";
    case "delivered":
      return "Delivered with evidence";
    case "blocked":
      return "Blocked";
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
