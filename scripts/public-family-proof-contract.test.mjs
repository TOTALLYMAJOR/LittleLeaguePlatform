import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPublicFamilyProofPlan,
  createPublicOrganizationFingerprint,
  evaluateRenderedPublicFamilyProof
} from "./public-family-proof-contract.mjs";

const organizationId = "11111111-1111-4111-8111-111111111111";
const reviewWindow = "within two business days";

test("classifies loopback targets as local without hosted expectations", () => {
  const plan = buildPublicFamilyProofPlan({
    baseUrl: "http://127.0.0.1:3022"
  });
  const localDomainPlan = buildPublicFamilyProofPlan({
    baseUrl: "http://leaguepilot.local:3022"
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.mode, "local");
  assert.equal(plan.expectedOrganizationFingerprint, "");
  assert.equal(localDomainPlan.ok, true);
  assert.equal(localDomainPlan.mode, "local");

  const result = evaluateRenderedPublicFamilyProof(plan);
  assert.equal(result.ok, true);
  assert.equal(result.mode, "local");
});

test("accepts valid hosted proof with matching rendered evidence", () => {
  const fingerprint = createPublicOrganizationFingerprint(organizationId);
  const plan = buildPublicFamilyProofPlan({
    baseUrl: "https://preview.leaguepilot.test",
    expectedOrganizationId: organizationId,
    expectedReviewWindow: reviewWindow
  });

  const result = evaluateRenderedPublicFamilyProof(plan, {
    publicOrganizationFingerprint: fingerprint,
    reviewWindowConfigured: "true",
    reviewWindowCopy: `An administrator compares your details with current registration or roster records. The usual review target is ${reviewWindow}.`
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.mode, "hosted");
  assert.equal(plan.expectedOrganizationFingerprint, fingerprint);
  assert.equal(result.ok, true);
  assert.equal(result.checks.organizationFingerprintMatches, true);
  assert.equal(result.checks.reviewWindowConfigured, true);
  assert.equal(result.checks.reviewWindowCopyMatches, true);
});

test("rejects invalid hosted organization UUID expectations", () => {
  const plan = buildPublicFamilyProofPlan({
    baseUrl: "https://preview.leaguepilot.test",
    expectedOrganizationId: "leaguepilot-demo",
    expectedReviewWindow: reviewWindow
  });

  assert.equal(plan.ok, false);
  assert.match(plan.blockers.join("\n"), /PUBLIC_ORGANIZATION_ID must be the expected hosted organization UUID/);
});

test("rejects missing hosted review window expectations", () => {
  const plan = buildPublicFamilyProofPlan({
    baseUrl: "https://preview.leaguepilot.test",
    expectedOrganizationId: organizationId
  });

  assert.equal(plan.ok, false);
  assert.match(plan.blockers.join("\n"), /PUBLIC_ACCESS_REVIEW_WINDOW is required/);
});

test("blocks mismatched rendered public organization fingerprint", () => {
  const plan = buildPublicFamilyProofPlan({
    baseUrl: "https://preview.leaguepilot.test",
    expectedOrganizationId: organizationId,
    expectedReviewWindow: reviewWindow
  });

  const result = evaluateRenderedPublicFamilyProof(plan, {
    publicOrganizationFingerprint: "0000000000000000",
    reviewWindowConfigured: "true",
    reviewWindowCopy: `The usual review target is ${reviewWindow}.`
  });

  assert.equal(result.ok, false);
  assert.equal(result.checks.organizationFingerprintMatches, false);
  assert.match(result.blockers.join("\n"), /fingerprint does not match/);
});

test("blocks missing rendered review-window configured-state evidence", () => {
  const plan = buildPublicFamilyProofPlan({
    baseUrl: "https://preview.leaguepilot.test",
    expectedOrganizationId: organizationId,
    expectedReviewWindow: reviewWindow
  });

  const result = evaluateRenderedPublicFamilyProof(plan, {
    publicOrganizationFingerprint: createPublicOrganizationFingerprint(organizationId),
    reviewWindowCopy: `The usual review target is ${reviewWindow}.`
  });

  assert.equal(result.ok, false);
  assert.equal(result.checks.reviewWindowConfigured, false);
  assert.match(result.blockers.join("\n"), /missing the review-window configured state/);
});

test("blocks rendered review-window copy mismatches", () => {
  const plan = buildPublicFamilyProofPlan({
    baseUrl: "https://preview.leaguepilot.test",
    expectedOrganizationId: organizationId,
    expectedReviewWindow: reviewWindow
  });

  const result = evaluateRenderedPublicFamilyProof(plan, {
    publicOrganizationFingerprint: createPublicOrganizationFingerprint(organizationId),
    reviewWindowConfigured: "true",
    reviewWindowCopy: "The usual review target is later this season."
  });

  assert.equal(result.ok, false);
  assert.equal(result.checks.reviewWindowCopyMatches, false);
  assert.match(result.blockers.join("\n"), /review-window copy does not include/);
});
