#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_SOURCE_FILES = {
  sponsorProgramDomain: "lib/domain/sponsor-program.ts",
  sponsorProgramAdapter: "lib/supabase/sponsor-program.ts",
  moneySponsorsDomain: "lib/domain/money-sponsors.ts",
  featurePanels: "components/feature-panels.tsx",
  sponsorHub: "components/sponsor-hub.tsx",
  sponsorHubTest: "components/sponsor-hub.test.tsx",
  publicSponsorsPage: "app/sponsors/page.tsx",

  sponsorAdapter: "lib/supabase/sponsors.ts",
  sponsorOperations: "lib/supabase/operations.ts",
  payments: "lib/supabase/payments.ts",
  stripeConnect: "lib/services/stripe-connect.ts",
  sponsorCheckoutRoute: "app/api/admin/payments/sponsor-checkout/route.ts",
  stripeWebhookRoute: "app/api/provider-webhooks/stripe/route.ts",
  revenueSummaryRoute: "app/api/admin/revenue-summary/route.ts",

  sponsorBillingMigration: "supabase/migrations/0017_sponsor_billing_and_team_builder.sql",
  sponsorProgramMigration: "supabase/migrations/20260819161500_sponsor_program_spine.sql",
  sponsorPaymentIntegrityMigration: "supabase/migrations/20260820200000_sponsor_payment_integrity.sql",

  featuresDocs: "docs/Features.md",
  capabilityMatrix: "docs/capability-matrix.md",
  privacyDocs: "docs/privacy-security.md",
  runbook: "docs/runbook.md",
  workPlan: "docs/missing-production-slices-work-plan.md",
  taskBoard: "docs/production-task-board.md"
};

const DOC_KEYS = ["runbook", "workPlan", "taskBoard"];

export const OPEN_GATES = [
  "Stripe sandbox account setup",
  "restricted key creation",
  "webhook endpoint registration",
  "signing-secret configuration",
  "sandbox Checkout Session proof",
  "signed webhook replay/duplicate proof",
  "refund/failure proof",
  "hosted admin proof",
  "finance reconciliation",
  "production payment approval"
];

function combined(sources, keys) {
  return keys.map((key) => sources[key] ?? "").join("\n\n");
}

function fileLabels(keys) {
  return keys.map((key) => DEFAULT_SOURCE_FILES[key] ?? key);
}

function addBlocker(blockers, family, code, keys, message) {
  blockers.push({
    family,
    code,
    paths: fileLabels(keys),
    message
  });
}

function requirePattern(blockers, sources, family, code, keys, pattern, message) {
  const text = combined(sources, keys);
  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  const ok = patterns.every((item) => typeof item === "string" ? text.includes(item) : item.test(text));
  if (!ok) addBlocker(blockers, family, code, keys, message);
}

function requireNoPattern(blockers, sources, family, code, keys, pattern, message) {
  const text = combined(sources, keys);
  if (pattern.test(text)) addBlocker(blockers, family, code, keys, message);
}

export function readRepositorySources(rootDir = process.cwd(), sourceFiles = DEFAULT_SOURCE_FILES) {
  return Object.fromEntries(
    Object.entries(sourceFiles).map(([key, relativePath]) => [
      key,
      readFileSync(resolve(rootDir, relativePath), "utf8")
    ])
  );
}

function verifyProductDecisionBoundary(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "product-decision-proof-boundary",
    "SPONSOR_PROGRAM_MONEY_VOCABULARY_MISSING",
    ["sponsorProgramDomain", "sponsorProgramMigration", "sponsorBillingMigration"],
    [
      'SponsorshipInvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "void" | "refunded"',
      'paymentState: "not_invoiced" | "awaiting_payment" | "partially_paid" | "paid" | "refunded" | "disputed"',
      "agreementRecorded: boolean",
      "SPONSOR_BILLING_SECURITY_NOTES",
      "unique (provider, provider_event_id)",
      "sponsor_payment_ledger_append_only",
      "public_display_separated boolean not null default true",
      "organization admins manage sponsor billing records",
      "organization admins read sponsor payment ledger entries"
    ],
    "The sponsor money vocabulary must live in one place, fold balances from an append-only replay-guarded ledger, distinguish a recorded agreement from an absent one, and keep persistence admin-only."
  );
  requireNoPattern(
    blockers,
    sources,
    "product-decision-proof-boundary",
    "SPONSOR_STORED_BALANCE_COLUMN_PRESENT",
    ["sponsorProgramMigration"],
    /paid_cents|outstanding_cents|refunded_cents|disputed_cents|balance_cents/s,
    "Sponsor balances must be folded from the payment ledger on read; no stored balance column may exist."
  );
  requirePattern(
    blockers,
    sources,
    "product-decision-proof-boundary",
    "SPONSOR_PROOF_ONLY_COPY_MISSING",
    ["sponsorProgramDomain", "featurePanels", "moneySponsorsDomain", "capabilityMatrix", "privacyDocs"],
    /do not couple billing status to child-facing sponsor display[\s\S]*Record invoice and payment proof before activating paid sponsor billing claims[\s\S]*Stripe live collection is not connected[\s\S]*Browser return or public placement is not settlement[\s\S]*Payment confirmation requires verified Stripe webhook evidence/s,
    "Source and docs must preserve the proof-only-versus-sandbox boundary and must not present proof-only status, browser return, or public placement as Stripe settlement."
  );
  requirePattern(
    blockers,
    sources,
    "product-decision-proof-boundary",
    "BROWSER_RETURN_NO_PAID_CLAIM_MISSING",
    ["payments"],
    /payment_return=received[\s\S]*Returning from Stripe will not mark payment confirmed[\s\S]*payment_return=received[\s\S]*Sponsor payment link issued\. Sponsor placement remains independent from payment state[\s\S]*Browser return state was not used/s,
    "Checkout return URLs and messages must not mark a family obligation or sponsor billing record paid."
  );
}

function verifyCheckoutSessionsReadiness(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "checkout-sessions-readiness",
    "SPONSOR_CHECKOUT_ROUTE_SESSION_ACTOR_MISSING",
    ["sponsorCheckoutRoute"],
    /requireAuthenticatedRouteUser\(request\)[\s\S]*createSponsorInvoiceCheckout\(\{[\s\S]*invoiceId,[\s\S]*sponsorBillingRecordId,[\s\S]*actorUserId:\s*auth\.user\.id/s,
    "Sponsor Checkout route must derive the actor from the authenticated route session."
  );
  requirePattern(
    blockers,
    sources,
    "checkout-sessions-readiness",
    "SPONSOR_CHECKOUT_ADMIN_AND_GATE_CHECKS_MISSING",
    ["payments", "stripeConnect"],
    /(?=[\s\S]*featureGateDecision\(\{[\s\S]*feature:\s*"payments")(?=[\s\S]*\.select\("payments_enabled"\))(?=[\s\S]*stripeConnectReadiness\(\))(?=[\s\S]*createSponsorInvoiceCheckout[\s\S]*requireActiveOrganizationAdmin\(\{[\s\S]*action:\s*"create a sponsor payment link")(?=[\s\S]*billing\.data\.status === "paid"[\s\S]*already paid according to the payment ledger)(?=[\s\S]*billing\.data\.status === "void")(?=[\s\S]*createSponsorInvoiceCheckout[\s\S]*if \(!gate\.enabled\))/s,
    "Sponsor collection must require organization-admin authority, refuse invoices the payment ledger already reports as paid or void, and enforce server plus organization payment gates."
  );
  requirePattern(
    blockers,
    sources,
    "checkout-sessions-readiness",
    "SPONSOR_CHECKOUT_CONNECT_CHARGE_READINESS_MISSING",
    ["payments"],
    /organization_stripe_accounts[\s\S]*stripe_account_id,charges_enabled_at[\s\S]*!account\.data\?\.stripe_account_id \|\| !account\.data\.charges_enabled_at[\s\S]*League payment account is not verified for charges/s,
    "Sponsor collection must refuse unverified Stripe Connect charge readiness."
  );
  requirePattern(
    blockers,
    sources,
    "checkout-sessions-readiness",
    "SPONSOR_CHECKOUT_SESSION_CONTRACT_MISSING",
    ["payments"],
    /const metadata = \{[\s\S]*leaguepilot_kind:\s*"sponsor_billing"[\s\S]*leaguepilot_sponsor_invoice_id:\s*billing\.data\.id[\s\S]*leaguepilot_organization_id:\s*billing\.data\.organization_id[\s\S]*stripe\.checkout\.sessions\.create\(\{[\s\S]*mode:\s*"payment"[\s\S]*line_items:[\s\S]*price_data:[\s\S]*success_url:\s*`\$\{baseUrl\}\/admin\/sponsors\?payment_return=received&session_id=\{CHECKOUT_SESSION_ID\}`[\s\S]*cancel_url:[\s\S]*metadata,[\s\S]*payment_intent_data:\s*\{ metadata \}[\s\S]*stripeAccount:\s*account\.data\.stripe_account_id[\s\S]*idempotencyKey:\s*billing\.data\.legacy_billing_record_id[\s\S]*`sponsor-billing:\$\{billing\.data\.legacy_billing_record_id\}`[\s\S]*`sponsor-invoice:\$\{billing\.data\.id\}`/s,
    "Sponsor collection must use server-side Stripe Checkout Sessions with organization and sponsor-billing metadata, payment-intent metadata, connected account binding, and idempotency."
  );
  requireNoPattern(
    blockers,
    sources,
    "checkout-sessions-readiness",
    "STRIPE_PAYMENT_METHOD_TYPES_PRESENT",
    ["payments"],
    /\bpayment_method_types\b/s,
    "Stripe Checkout and PaymentIntent calls must omit payment_method_types so Dashboard-managed dynamic payment methods remain available."
  );
}

function verifyKeyEnvironmentSecurity(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "key-environment-security",
    "STRIPE_SERVER_CONFIGURATION_MISSING",
    ["stripeConnect", "payments", "stripeWebhookRoute"],
    /if \(!env\.STRIPE_SECRET_KEY\) throw new Error\("Stripe server key is not configured\."\)[\s\S]*env\.STRIPE_SECRET_KEY[\s\S]*env\.STRIPE_WEBHOOK_SECRET[\s\S]*STRIPE_CONNECT_RETURN_URL[\s\S]*STRIPE_CONNECT_REFRESH_URL[\s\S]*Stripe Connect server or webhook configuration is incomplete[\s\S]*Stripe webhook verification is not configured/s,
    "Stripe credentials must stay server-side, and missing server/webhook/return-url configuration must fail closed."
  );
  requirePattern(
    blockers,
    sources,
    "key-environment-security",
    "RESTRICTED_KEYS_AND_ENV_DOCS_MISSING",
    ["runbook", "workPlan", "taskBoard", "sponsorProgramDomain", "featurePanels"],
    /restricted (?:API )?keys[\s\S]*separate environments[\s\S]*No Stripe secret or restricted key values are stored in source[\s\S]*Stripe keys must stay server-side and preferably use restricted keys/s,
    "Docs and source copy must prefer restricted API keys, separate environments, and no committed Stripe secret or restricted key values."
  );
  requireNoPattern(
    blockers,
    sources,
    "key-environment-security",
    "CLIENT_STRIPE_SECRET_REFERENCE_PRESENT",
    ["sponsorHub", "featurePanels", "publicSponsorsPage"],
    /STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|NEXT_PUBLIC_STRIPE|new Stripe\(/s,
    "UI and public surfaces must not reference Stripe server credentials or instantiate Stripe."
  );
  requireNoPattern(
    blockers,
    sources,
    "key-environment-security",
    "STRIPE_SECRET_VALUE_EXPOSED",
    Object.keys(DEFAULT_SOURCE_FILES),
    /\b(?:sk|rk)_(?:test|live)_[A-Za-z0-9]{8,}\b/s,
    "Repository source fixtures scanned by this verifier must not expose Stripe secret-key or restricted-key values."
  );
  requireNoPattern(
    blockers,
    sources,
    "key-environment-security",
    "STRIPE_SECRET_LOGGING_PRESENT",
    ["payments", "stripeConnect", "stripeWebhookRoute", "sponsorCheckoutRoute"],
    /console\.(?:log|error|warn|info)|catch\s*\([^)]*(?:error|err)[^)]*\)[\s\S]*(?:message|stack)/s,
    "Stripe payment routes and services must not log secrets or echo raw provider errors."
  );
}

function verifyWebhookSettlementTruth(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "webhook-settlement-truth",
    "STRIPE_WEBHOOK_SIGNATURE_VERIFICATION_MISSING",
    ["stripeWebhookRoute"],
    /request\.headers\.get\("stripe-signature"\)[\s\S]*process\.env\.STRIPE_WEBHOOK_SECRET[\s\S]*await request\.text\(\)[\s\S]*webhooks\.constructEvent\(rawBody,\s*signature,\s*webhookSecret\)[\s\S]*Stripe webhook signature verification failed/s,
    "Stripe webhook route must verify stripe-signature with STRIPE_WEBHOOK_SECRET against the untouched raw body."
  );
  requirePattern(
    blockers,
    sources,
    "webhook-settlement-truth",
    "SIGNED_PAYMENT_EVIDENCE_MISSING",
    ["payments", "sponsorProgramAdapter", "sponsorPaymentIntegrityMigration"],
    /commitVerifiedStripeEvent\(event: Stripe\.Event\)[\s\S]*event\.account[\s\S]*organization_stripe_accounts[\s\S]*recordSponsorStripeEvent[\s\S]*record_sponsor_stripe_event[\s\S]*insert into public\.payment_evidence[\s\S]*insert into public\.sponsor_payment_ledger_entries/s,
    "Webhook processing must bind events to a known connected account and record signed payment evidence with event identity."
  );
  requirePattern(
    blockers,
    sources,
    "webhook-settlement-truth",
    "WEBHOOK_DUPLICATE_IDEMPOTENCY_MISSING",
    ["payments", "sponsorProgramAdapter", "sponsorPaymentIntegrityMigration"],
    /providerResourceId[\s\S]*recordSponsorStripeEvent[\s\S]*provider_resource_id[\s\S]*on conflict do nothing[\s\S]*ledger_id is null/s,
    "Webhook processing must treat event and provider-resource replays idempotently only after the atomic ledger transaction is complete."
  );
  requirePattern(
    blockers,
    sources,
    "webhook-settlement-truth",
    "WEBHOOK_EVENT_FAMILY_HANDLING_MISSING",
    ["payments", "sponsorPaymentIntegrityMigration"],
    /(?=[\s\S]*checkout\.session\.completed)(?=[\s\S]*object\.payment_status === "paid")(?=[\s\S]*payment_intent\.payment_failed)(?=[\s\S]*refund\.created)(?=[\s\S]*refund\.updated)(?=[\s\S]*charge\.dispute\.created)(?=[\s\S]*sponsor_billing_records)(?=[\s\S]*account\.updated)(?=[\s\S]*charges_enabled_at)/s,
    "Webhook processing must distinguish checkout, failure, successful refund, dispute, legacy compatibility, and Connect account readiness events."
  );
  requirePattern(
    blockers,
    sources,
    "webhook-settlement-truth",
    "WEBHOOK_SETTLEMENT_BINDING_FIELDS_MISSING",
    ["payments", "sponsorProgramAdapter", "sponsorPaymentIntegrityMigration"],
    /(?=[\s\S]*metadata\.leaguepilot_obligation_id)(?=[\s\S]*metadata\.leaguepilot_sponsor_billing_id)(?=[\s\S]*paymentIntentIdFor)(?=[\s\S]*p_checkout_session_id)(?=[\s\S]*p_payment_intent_id)(?=[\s\S]*p_amount_cents)(?=[\s\S]*p_provider_event_type)(?=[\s\S]*p_provider_resource_id)/s,
    "Webhook evidence must retain organization metadata, sponsor billing record metadata, checkout session/payment intent, amount, currency, and event identity before any paid claim."
  );
  requirePattern(
    blockers,
    sources,
    "webhook-settlement-truth",
    "BROWSER_RETURN_NOT_SETTLEMENT_MESSAGE_MISSING",
    ["payments"],
    "Verified Stripe webhook evidence recorded. Browser return state was not used.",
    "Webhook settlement truth must remain the only paid-state message."
  );
}

function verifyAdminPublicPrivacySeparation(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "admin-public-privacy-separation",
    "ADMIN_SPONSOR_HUB_SEPARATION_MISSING",
    ["sponsorHub", "sponsorHubTest"],
    /paidProgramSummaries[\s\S]*summary\.paymentState === "paid" && summary\.outstandingCents === 0[\s\S]*verifiedRevenueCents[\s\S]*summary\.paidCents - summary\.refundedCents[\s\S]*No settled payment proof recorded[\s\S]*Public placement stays separate from payment and fulfillment evidence[\s\S]*Delivery proof[\s\S]*Fully paid sponsor programs[\s\S]*Verified impact events[\s\S]*Renewal email delivery is not connected[\s\S]*Player and family data are never included/s,
    "Sponsor Hub must separate sponsor records, placement, invoice/payment proof, refund/failure follow-up by proof-safe copy, fulfillment, report export, public display, impact, renewal, and family privacy."
  );
  requirePattern(
    blockers,
    sources,
    "admin-public-privacy-separation",
    "ADMIN_SPONSOR_MUTATION_BOUNDARY_MISSING",
    ["sponsorOperations"],
    /requireActiveOrganizationAdmin\(\{[\s\S]*action:\s*"manage sponsors"[\s\S]*audit_events[\s\S]*sponsor_save_requested[\s\S]*sponsor_placements[\s\S]*sponsor_assets[\s\S]*No Stripe or renewal-provider call occurred/s,
    "Admin sponsor operations must be audited sponsor/placement/logo-review mutations only and must not call Stripe or renewal providers."
  );
  requirePattern(
    blockers,
    sources,
    "admin-public-privacy-separation",
    "PUBLIC_SPONSOR_PRIVACY_COPY_MISSING",
    ["publicSponsorsPage", "moneySponsorsDomain", "featuresDocs", "capabilityMatrix"],
    /(?=[\s\S]*Public sponsor placement never includes child profiles, parent contact details,\s*private media, billing state, or claims of delivered impact)(?=[\s\S]*do not expose child profiles, parent contact data, private media, or payment state)(?=[\s\S]*exposes no child profiles, parent contacts, private media, billing state, checkout, contract, placement-delivery, or impact proof)(?=[\s\S]*never expose child profiles, parent contacts, private media, billing state, or redemption proof)/s,
    "Public and parent-facing sponsor surfaces must never expose sponsor billing state, child profiles, parent contacts, private media, or redemption proof."
  );
  requirePattern(
    blockers,
    sources,
    "admin-public-privacy-separation",
    "REVENUE_SUMMARY_WEBHOOK_GATED_MISSING",
    ["revenueSummaryRoute"],
    /(?=[\s\S]*Stripe settlement remains webhook-proof gated)(?=[\s\S]*sponsorInvoiceCents)(?=[\s\S]*confirmedSponsorPaymentCents)(?=[\s\S]*paymentProofStatus === "paid" && Boolean\(record\.confirmedAt\))(?=[\s\S]*confirmed payment totals also require paid proof and a provider-confirmed timestamp)/s,
    "Admin revenue summaries must keep invoice readiness and provider-confirmed payment totals separate."
  );
}

function verifyOpenGatesDocumentation(sources, blockers) {
  for (const gate of OPEN_GATES) {
    requirePattern(
      blockers,
      sources,
      "open-gates-documentation",
      `OPEN_GATE_${gate.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_MISSING`,
      DOC_KEYS,
      gate,
      `Docs must name ${gate} as an open gate beyond local repository readiness.`
    );
  }
  for (const key of DOC_KEYS) {
    requirePattern(
      blockers,
      sources,
      "open-gates-documentation",
      `LOCAL_ONLY_VERIFIER_${key.toUpperCase()}_MISSING`,
      [key],
      /qa:sponsor-stripe-readiness[\s\S]*local repository readiness proof only[\s\S]*(?:does not|must not) (?:call Stripe|create Checkout Sessions|mutate hosted records|claim sandbox|close sandbox)/s,
      `${DEFAULT_SOURCE_FILES[key]} must describe qa:sponsor-stripe-readiness as local repository readiness proof only and preserve provider/hosted/payment gates.`
    );
  }
}

export function verifySponsorStripeReadiness(sources) {
  const blockers = [];

  verifyProductDecisionBoundary(sources, blockers);
  verifyCheckoutSessionsReadiness(sources, blockers);
  verifyKeyEnvironmentSecurity(sources, blockers);
  verifyWebhookSettlementTruth(sources, blockers);
  verifyAdminPublicPrivacySeparation(sources, blockers);
  verifyOpenGatesDocumentation(sources, blockers);

  return {
    ok: blockers.length === 0,
    blockers,
    families: [
      "product-decision-proof-boundary",
      "checkout-sessions-readiness",
      "key-environment-security",
      "webhook-settlement-truth",
      "admin-public-privacy-separation",
      "open-gates-documentation"
    ],
    openGates: OPEN_GATES,
    proofBoundary: "local repository-source readiness proof only"
  };
}

export function formatSponsorStripeReadinessReport(result) {
  const lines = [
    "Sponsor Stripe readiness verifier",
    `Status: ${result.ok ? "PASS" : "FAIL"}`,
    "Scope: local repository-source readiness proof only.",
    "This command reads repository files only and does not call Stripe, Supabase, browser automation, provider dashboards, hosted deployments, or payment endpoints."
  ];

  if (result.blockers.length) {
    lines.push("", "Named blockers:");
    for (const blocker of result.blockers) {
      lines.push(`- [${blocker.family}] ${blocker.code}: ${blocker.message}`);
      lines.push(`  Paths: ${blocker.paths.join(", ")}`);
    }
  } else {
    lines.push("", "No local source-contract blockers found.");
  }

  lines.push("", "Open gates not closed by this verifier:");
  for (const gate of result.openGates) lines.push(`- ${gate}`);

  return lines.join("\n");
}

function main() {
  const result = verifySponsorStripeReadiness(readRepositorySources());
  console.log(formatSponsorStripeReadinessReport(result));
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
