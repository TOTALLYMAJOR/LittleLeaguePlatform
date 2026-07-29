import assert from "node:assert/strict";
import test from "node:test";

import {
  formatAdminProofClosureReadinessReport,
  readRepositorySources,
  verifyAdminProofClosureReadiness
} from "./verify-admin-proof-closure-readiness.mjs";

const fixtureSources = readRepositorySources();

function cloneSources() {
  return { ...fixtureSources };
}

function codesFor(result, family) {
  return result.blockers
    .filter((blocker) => blocker.family === family)
    .map((blocker) => blocker.code);
}

test("passes against repository source fixtures without hosted credentials or network access", () => {
  const result = verifyAdminProofClosureReadiness(cloneSources());

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
  assert.match(formatAdminProofClosureReadinessReport(result), /local repository-source contract only/);
  assert.match(formatAdminProofClosureReadinessReport(result), /deployed edge or shared-store rate-limit proof/);
});

test("fails media report readiness when report identity stops using the verified route session", () => {
  const sources = cloneSources();
  sources.mediaReportRoute = sources.mediaReportRoute.replace(
    "reporterUserId: auth.user.id",
    "reporterUserId: String(body.reporterUserId)"
  );

  const result = verifyAdminProofClosureReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "media-report").includes("MEDIA_REPORT_SESSION_ACTOR_MISSING"));
});

test("fails media moderation readiness when review history evidence is removed", () => {
  const sources = cloneSources();
  sources.operations = sources.operations.replaceAll(
    "media_review_history",
    "media_review_notes"
  );

  const result = verifyAdminProofClosureReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "media-moderation").includes("MEDIA_MODERATION_EVIDENCE_MISSING"));
});

test("fails team-builder publish readiness when workflow proof is weakened", () => {
  const sources = cloneSources();
  sources.domainTest = sources.domainTest.replace(
    "Preview -> Edit -> Approve -> Publish",
    "Preview -> Publish"
  );

  const result = verifyAdminProofClosureReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "team-builder-publish").includes("TEAM_BUILDER_WORKFLOW_MISSING"));
});

test("fails broader admin scope readiness when unrelated tenant export exclusion is removed", () => {
  const sources = cloneSources();
  sources.reportingTest = sources.reportingTest.replace(
    'expect(result.csv).not.toContain("Other Tenant Parent");',
    'expect(result.csv).toContain("Other Tenant Parent");'
  );

  const result = verifyAdminProofClosureReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "admin-scope").includes("ADMIN_EXPORT_RELATED_ROWS_SCOPE_MISSING"));
});

test("fails public intake abuse controls when Retry-After is no longer emitted", () => {
  const sources = cloneSources();
  sources.publicIntakeLimiter = sources.publicIntakeLimiter.replace(
    'headers.set("Retry-After", String(input.retryAfterSeconds));',
    'headers.set("X-Retry-After", String(input.retryAfterSeconds));'
  );

  const result = verifyAdminProofClosureReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "public-intake-abuse-controls").includes("PUBLIC_INTAKE_HEADERS_MISSING"));
});

test("fails public intake abuse controls when the durable claim RPC is bypassed", () => {
  const sources = cloneSources();
  sources.publicIntakeLimiter = sources.publicIntakeLimiter.replace(
    '.rpc("claim_public_rate_limit"',
    '.rpc("claim_unscoped_rate_limit"'
  );

  const result = verifyAdminProofClosureReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "public-intake-abuse-controls").includes("PUBLIC_INTAKE_SHARED_LIMITER_MISSING"));
});
