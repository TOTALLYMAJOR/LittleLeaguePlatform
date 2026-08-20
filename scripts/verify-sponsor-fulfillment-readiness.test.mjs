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
  assert.match(report, /hosted fulfillment evidence proof/);
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

test("fails evidence derivation when a deliverable state is stored in the schema", () => {
  const sources = cloneSources();
  sources.sponsorFulfillmentMigration = sources.sponsorFulfillmentMigration.replace(
    "  required_quantity integer not null default 1 check (required_quantity > 0),",
    "  required_quantity integer not null default 1 check (required_quantity > 0),\n  delivery_state text not null default 'not_started',"
  );

  const result = verifySponsorFulfillmentReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "fulfillment-evidence-derivation").includes("STORED_DELIVERABLE_STATE_PRESENT"));
});

test("fails evidence derivation when delivered no longer requires an evidence row", () => {
  const sources = cloneSources();
  sources.sponsorProgramDomain = sources.sponsorProgramDomain.replace(
    'if (requirementEvidence.length > 0) return "delivered";',
    'if (requirementEvidence.length >= 0) return "delivered";'
  );

  const result = verifySponsorFulfillmentReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "fulfillment-evidence-derivation").includes("DERIVATION_INVARIANT_MISSING"));
});

test("fails evidence derivation when evidence capture drops organization-admin authority", () => {
  // Authority is re-derived in SQL rather than in the adapter, so that is where removing it has to
  // be caught. The membership predicate is the whole check.
  const sources = cloneSources();
  sources.sponsorFulfillmentCaptureMigration = sources.sponsorFulfillmentCaptureMigration.replace(
    "and membership.role = 'admin'",
    "and membership.role is not null"
  );

  const result = verifySponsorFulfillmentReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "fulfillment-evidence-derivation").includes("EVIDENCE_CAPTURE_AUTHORITY_MISSING"));
});

test("fails evidence derivation when a missing requirement is distinguishable from a forbidden one", () => {
  const sources = cloneSources();
  sources.sponsorFulfillmentCaptureMigration = `${sources.sponsorFulfillmentCaptureMigration}\n-- the requirement could not be found\n`;

  const result = verifySponsorFulfillmentReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "fulfillment-evidence-derivation").includes("EVIDENCE_EXISTENCE_ORACLE_PRESENT"));
});

test("fails evidence derivation when the observation uniqueness guard is dropped", () => {
  const sources = cloneSources();
  sources.sponsorFulfillmentCaptureMigration = sources.sponsorFulfillmentCaptureMigration.replace(
    "unique nulls not distinct (requirement_id, kind, observed_at, artifact_url, note)",
    "unique (requirement_id, kind, observed_at)"
  );

  const result = verifySponsorFulfillmentReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "fulfillment-evidence-derivation").includes("EVIDENCE_CAPTURE_NOT_ATOMIC"));
});

test("fails evidence derivation when a route or adapter writes a delivered state directly", () => {
  const sources = cloneSources();
  sources.sponsorProgramAdapter = `${sources.sponsorProgramAdapter}\nconst optimistic = { status: "delivered" };\n`;

  const result = verifySponsorFulfillmentReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "fulfillment-evidence-derivation").includes("UNPROVEN_DELIVERED_WRITE_PRESENT"));
});

test("fails evidence derivation when the append-only revoke on evidence is dropped", () => {
  const sources = cloneSources();
  sources.sponsorFulfillmentMigration = sources.sponsorFulfillmentMigration.replace(
    "revoke update, delete on table public.sponsor_fulfillment_evidence from service_role;",
    ""
  );

  const result = verifySponsorFulfillmentReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "fulfillment-evidence-derivation").includes("EVIDENCE_APPEND_ONLY_MISSING"));
});

test("fails evidence derivation when the append-only trigger on evidence is dropped", () => {
  const sources = cloneSources();
  sources.sponsorFulfillmentMigration = sources.sponsorFulfillmentMigration.replace(
    /create trigger sponsor_fulfillment_evidence_append_only\s+before update or delete on public\.sponsor_fulfillment_evidence/,
    "create trigger sponsor_fulfillment_evidence_append_only\n  before insert on public.sponsor_fulfillment_evidence"
  );

  const result = verifySponsorFulfillmentReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "fulfillment-evidence-derivation").includes("EVIDENCE_APPEND_ONLY_MISSING"));
});

test("fails evidence derivation when evidence loses its composite tie to the requirement's organization", () => {
  const sources = cloneSources();
  sources.sponsorFulfillmentMigration = sources.sponsorFulfillmentMigration.replace(
    /foreign key \(requirement_id, organization_id\)\s+references public\.sponsor_fulfillment_requirements\(id, organization_id\)/,
    "foreign key (requirement_id)\n    references public.sponsor_fulfillment_requirements(id)"
  );

  const result = verifySponsorFulfillmentReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "fulfillment-evidence-derivation").includes("TENANT_COMPOSITE_KEY_MISSING"));
});

test("fails evidence derivation when seeded package benefits carry no requirement kind", () => {
  const sources = cloneSources();
  sources.demoTenantSeed = `${sources.demoTenantSeed}\n  benefits: ["Team portal placement"],\n`;

  const result = verifySponsorFulfillmentReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "fulfillment-evidence-derivation").includes("UNSTRUCTURED_PACKAGE_BENEFITS_PRESENT"));
});
