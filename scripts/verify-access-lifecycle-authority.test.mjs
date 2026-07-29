import assert from "node:assert/strict";
import test from "node:test";

import {
  formatAccessLifecycleAuthorityReport,
  readRepositorySources,
  verifyAccessLifecycleAuthority
} from "./verify-access-lifecycle-authority.mjs";

const fixtureSources = readRepositorySources();

function cloneSources() {
  return { ...fixtureSources };
}

function codesFor(result, family) {
  return result.blockers
    .filter((blocker) => blocker.family === family)
    .map((blocker) => blocker.code);
}

test("passes against repository source fixtures without hosted or provider access", () => {
  const result = verifyAccessLifecycleAuthority(cloneSources());

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
  assert.match(formatAccessLifecycleAuthorityReport(result), /local repository-source contract only/);
});

test("fails registration review when approval stops using the verified route session", () => {
  const sources = cloneSources();
  sources.registrationApproveRoute = sources.registrationApproveRoute.replace(
    "reviewerUserId: auth.user.id",
    "reviewerUserId: String(body.reviewerUserId)"
  );

  const result = verifyAccessLifecycleAuthority(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "registration-review").includes("REGISTRATION_APPROVAL_SESSION_REVIEWER_MISSING"));
});

test("fails invite acceptance when hashed one-time token lookup is weakened", () => {
  const sources = cloneSources();
  sources.inviteAcceptanceService = sources.inviteAcceptanceService.replace(
    'createHash("sha256")',
    'createHash("md5")'
  );

  const result = verifyAccessLifecycleAuthority(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "invite-acceptance").includes("INVITE_HASH_LOOKUP_MISSING"));
});

test("fails guardian repair when active organization-admin authority is removed", () => {
  const sources = cloneSources();
  sources.guardianLinksService = sources.guardianLinksService.replaceAll(
    "requireActiveOrganizationAdmin",
    "missingActiveOrganizationAdmin"
  );

  const result = verifyAccessLifecycleAuthority(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "guardian-link-repair").includes("GUARDIAN_REPAIR_ADMIN_AUTHORITY_MISSING"));
});

test("fails additional guardian review when the standard linked-guardian scope is changed", () => {
  const sources = cloneSources();
  sources.additionalGuardianMigration = sources.additionalGuardianMigration.replaceAll(
    "standard_linked_guardian_access",
    "expanded_guardian_access"
  );

  const result = verifyAccessLifecycleAuthority(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "additional-guardian-review").includes("ADDITIONAL_GUARDIAN_STANDARD_SCOPE_MISSING"));
});
