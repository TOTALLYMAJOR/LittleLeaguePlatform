import type { Sponsor } from "./types";

export type SponsorBillingStatus = "draft" | "invoice_ready" | "payment_recorded";

export interface SponsorBillingProof {
  sponsorId: string;
  sponsorName: string;
  billingStatus: SponsorBillingStatus;
  productName: string;
  priceLookupKey: string;
  invoiceReference: string;
  amountCents: number;
  currency: "usd";
  paymentProofStatus: "not_requested" | "awaiting_invoice" | "paid";
  publicDisplaySeparated: boolean;
  childFacingDisplayBlocked: boolean;
  workflow: Array<"Draft" | "Review" | "Invoice" | "Record payment proof">;
  securityNotes: string[];
  auditSummary: string;
}

export interface SponsorBillingInput {
  amountCents?: number;
  billingStatus?: SponsorBillingStatus;
  invoiceReference?: string;
}

const billingWorkflow: SponsorBillingProof["workflow"] = ["Draft", "Review", "Invoice", "Record payment proof"];

function defaultAmountCents(sponsor: Sponsor) {
  return sponsor.level === "league" ? 25000 : 7500;
}

function lookupKeyFor(sponsor: Sponsor) {
  return `sponsor_${sponsor.level}_${sponsor.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
}

export function buildSponsorBillingProof(sponsor: Sponsor, input: SponsorBillingInput = {}): SponsorBillingProof {
  const amountCents = input.amountCents && input.amountCents > 0 ? input.amountCents : defaultAmountCents(sponsor);
  const billingStatus = input.billingStatus ?? "draft";
  const invoiceReference = input.invoiceReference ?? `draft-invoice-${sponsor.id}`;

  return {
    sponsorId: sponsor.id,
    sponsorName: sponsor.name,
    billingStatus,
    productName: `${sponsor.name} ${sponsor.level === "league" ? "league" : "team"} sponsorship`,
    priceLookupKey: lookupKeyFor(sponsor),
    invoiceReference,
    amountCents,
    currency: "usd",
    paymentProofStatus: billingStatus === "payment_recorded"
      ? "paid"
      : billingStatus === "invoice_ready"
        ? "awaiting_invoice"
        : "not_requested",
    publicDisplaySeparated: true,
    childFacingDisplayBlocked: true,
    workflow: billingWorkflow,
    securityNotes: [
      "Use Stripe Products and Prices for sponsor packages; do not couple billing status to child-facing sponsor display.",
      "Use server-side Stripe calls only with environment-managed restricted keys; never expose Stripe secret keys to the browser.",
      "Record invoice and payment proof before activating paid sponsor billing claims."
    ],
    auditSummary: `${sponsor.name} billing proof is ${billingStatus}; product ${lookupKeyFor(sponsor)} and invoice ${invoiceReference} are separated from public placement.`
  };
}

export function buildSponsorBillingProofs(sponsors: Sponsor[]) {
  return sponsors.map((sponsor) => buildSponsorBillingProof(sponsor, {
    billingStatus: sponsor.status === "active" ? "invoice_ready" : "draft"
  }));
}
