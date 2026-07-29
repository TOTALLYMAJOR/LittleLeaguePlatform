import assert from "node:assert/strict";
import test from "node:test";

import {
  formatSponsorFulfillmentReadinessReport,
  readRepositorySources,
  verifySponsorFulfillmentReadiness
} from "./verify-sponsor-fulfillment-readiness.mjs";

const fixtureSources = readRepositorySources();

function cloneSources() {
  return { ...fixtureSources };
}

function codesFor(result, family) {
  return result.blockers
    .filter((blocker) => blocker.family === family)
    .map((blocker) => blocker.code);
}

test("passes against repository source fixtures without credentials, network, Supabase, providers, Stripe, storage, logo fetches, or browser automation", () => {
  const result = verifySponsorFulfillmentReadiness(cloneSources());
  const report = formatSponsorFulfillmentReadinessReport(result);

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
  assert.match(report, /local repository-source readiness proof only/);
  assert.match(report, /hosted public\/admin browser proof/);
  assert.match(report, /observed placement-rendering proof/);
  assert.match(report, /approved logo asset proof/);
  assert.match(report, /sponsor recap\/report artifact proof/);
  assert.match(report, /renewal email sandbox proof/);
  assert.match(report, /public placement leak QA/);
  assert.match(report, /accessibility proof/);
  assert.match(report, /finance reconciliation/);
  assert.match(report, /production sponsor acceptance/);
});

test("fails verifier execution boundary when the package script is missing", () => {
  const sources = cloneSources();
  sources.packageJson = sources.packageJson.replace(
    '"qa:sponsor-fulfillment-readiness": "node scripts/verify-sponsor-fulfillment-readiness.mjs"',
    '"qa:sponsor-fulfillment-readiness-disabled": "node scripts/verify-sponsor-fulfillment-readiness.mjs"'
  );

  const result = verifySponsorFulfillmentReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "verifier-execution-boundary").includes("PACKAGE_SCRIPT_MISSING"));
});

test("fails placement authority when active approved placement filtering is weakened", () => {
  const sources = cloneSources();
  sources.sponsorPlacementDomain = sources.sponsorPlacementDomain.replace(
    'sponsor.status === "active" && sponsor.placementKey === placementKey',
    'sponsor.placementKey === placementKey'
  );

  const result = verifySponsorFulfillmentReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "placement-authority").includes("PLACEMENT_KEYS_AND_ACTIVE_FILTERS_MISSING"));
});

test("fails logo asset safety when approved logo reads are weakened", () => {
  const sources = cloneSources();
  sources.sponsorAdapter = sources.sponsorAdapter.replace(
    '.eq("status", "approved")',
    '.eq("status", "pending")'
  );

  const result = verifySponsorFulfillmentReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "logo-asset-safety").includes("APPROVED_LOGO_READS_MISSING"));
});

test("fails fulfillment and recap separation when zero verified impact is converted into a claim", () => {
  const sources = cloneSources();
  sources.sponsorHub = sources.sponsorHub.replace(
    "Verified impact events",
    "Estimated impact events"
  );

  const result = verifySponsorFulfillmentReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "fulfillment-recap-separation").includes("SPONSOR_HUB_FULFILLMENT_SEPARATION_MISSING"));
});

test("fails renewal delivery gates when renewal email disconnected copy is removed", () => {
  const sources = cloneSources();
  sources.sponsorHub = sources.sponsorHub.replace(
    "Renewal email delivery is not connected",
    "Renewal email is ready to send"
  );

  const result = verifySponsorFulfillmentReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "renewal-delivery-gates").includes("RENEWAL_HUMAN_REVIEW_AND_PROVIDER_GATE_MISSING"));
});

test("fails public and parent privacy when the public sponsor boundary is weakened", () => {
  const sources = cloneSources();
  sources.publicSponsorsPage = sources.publicSponsorsPage.replace(
    "Public sponsor placement never includes child profiles, parent contact details,",
    "Public sponsor placement may include child profiles and parent contact details,"
  );

  const result = verifySponsorFulfillmentReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "public-parent-privacy").includes("PUBLIC_SPONSOR_PRIVACY_COPY_MISSING"));
});

test("fails open gates documentation when production sponsor acceptance is omitted", () => {
  const sources = cloneSources();
  for (const key of ["runbook", "workPlan", "taskBoard"]) {
    sources[key] = sources[key].replaceAll("production sponsor acceptance", "launch readiness");
  }

  const result = verifySponsorFulfillmentReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "open-gates-documentation").includes("OPEN_GATE_PRODUCTION_SPONSOR_ACCEPTANCE_MISSING"));
});
