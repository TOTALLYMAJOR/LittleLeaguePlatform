import assert from "node:assert/strict";
import test from "node:test";

import {
  formatSponsorStripeReadinessReport,
  readRepositorySources,
  verifySponsorStripeReadiness
} from "./verify-sponsor-stripe-readiness.mjs";

const fixtureSources = readRepositorySources();

function cloneSources() {
  return { ...fixtureSources };
}

function codesFor(result, family) {
  return result.blockers
    .filter((blocker) => blocker.family === family)
    .map((blocker) => blocker.code);
}

test("passes against repository source fixtures without credentials, network, Supabase, Stripe, or browser automation", () => {
  const result = verifySponsorStripeReadiness(cloneSources());
  const report = formatSponsorStripeReadinessReport(result);

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
  assert.match(report, /local repository-source readiness proof only/);
  assert.match(report, /Stripe sandbox account setup/);
  assert.match(report, /restricted key creation/);
  assert.match(report, /webhook endpoint registration/);
  assert.match(report, /signing-secret configuration/);
  assert.match(report, /sandbox Checkout Session proof/);
  assert.match(report, /signed webhook replay\/duplicate proof/);
  assert.match(report, /refund\/failure proof/);
  assert.match(report, /hosted admin proof/);
  assert.match(report, /finance reconciliation/);
  assert.match(report, /production payment approval/);
});

test("fails product decision boundary when billing proof states are weakened", () => {
  const sources = cloneSources();
  sources.sponsorBillingDomain = sources.sponsorBillingDomain.replace(
    "publicDisplaySeparated: boolean;",
    "publicDisplayMerged: boolean;"
  );

  const result = verifySponsorStripeReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "product-decision-proof-boundary").includes("SPONSOR_BILLING_WORKFLOW_STATES_MISSING"));
});

test("fails Checkout readiness when dynamic payment methods are disabled", () => {
  const sources = cloneSources();
  sources.payments = sources.payments.replace(
    'mode: "payment",',
    'mode: "payment",\n      payment_method_types: ["card"],'
  );

  const result = verifySponsorStripeReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "checkout-sessions-readiness").includes("STRIPE_PAYMENT_METHOD_TYPES_PRESENT"));
});

test("fails key and environment security when restricted key guidance is removed", () => {
  const sources = cloneSources();
  for (const key of ["runbook", "workPlan", "taskBoard"]) {
    sources[key] = sources[key].replaceAll("restricted API keys", "broad API keys");
  }

  const result = verifySponsorStripeReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "key-environment-security").includes("RESTRICTED_KEYS_AND_ENV_DOCS_MISSING"));
});

test("fails webhook settlement truth when raw-body signature verification is removed", () => {
  const sources = cloneSources();
  sources.stripeWebhookRoute = sources.stripeWebhookRoute.replace(
    "webhooks.constructEvent(rawBody, signature, webhookSecret)",
    "webhooks.constructEvent(await request.json(), signature, webhookSecret)"
  );

  const result = verifySponsorStripeReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "webhook-settlement-truth").includes("STRIPE_WEBHOOK_SIGNATURE_VERIFICATION_MISSING"));
});

test("fails admin and public privacy separation when Sponsor Hub family-privacy copy is removed", () => {
  const sources = cloneSources();
  sources.sponsorHub = sources.sponsorHub.replace(
    "Player and family data are never included.",
    "Family details may be included when helpful."
  );
  sources.sponsorHubTest = sources.sponsorHubTest.replace(
    "Player and family data are never included",
    "Family details may be included when helpful"
  );

  const result = verifySponsorStripeReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "admin-public-privacy-separation").includes("ADMIN_SPONSOR_HUB_SEPARATION_MISSING"));
});

test("fails open gates documentation when production payment approval is omitted", () => {
  const sources = cloneSources();
  for (const key of ["runbook", "workPlan", "taskBoard"]) {
    sources[key] = sources[key].replaceAll("production payment approval", "launch readiness");
  }

  const result = verifySponsorStripeReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "open-gates-documentation").includes("OPEN_GATE_PRODUCTION_PAYMENT_APPROVAL_MISSING"));
});
