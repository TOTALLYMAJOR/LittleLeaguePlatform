import assert from "node:assert/strict";
import test from "node:test";

import {
  formatFamilySeasonContinuityReadinessReport,
  readRepositorySources,
  verifyFamilySeasonContinuityReadiness
} from "./verify-family-season-continuity-readiness.mjs";

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
  const result = verifyFamilySeasonContinuityReadiness(cloneSources());
  const report = formatFamilySeasonContinuityReadinessReport(result);

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
  assert.match(report, /local repository-source readiness proof only/);
  assert.match(report, /hosted browser proof/);
  assert.match(report, /Supabase readback/);
  assert.match(report, /populated media consent\/revocation proof/);
  assert.match(report, /multi-guardian transition concurrency proof/);
  assert.match(report, /storage\/scanner proof/);
  assert.match(report, /provider sandbox proof/);
  assert.match(report, /production acceptance/);
});

test("fails parent Replay read authority when published queue filtering is weakened", () => {
  const sources = cloneSources();
  sources.familyReplayService = sources.familyReplayService.replace(
    '.eq("status", "queued")',
    '.neq("status", "removed")'
  );

  const result = verifyFamilySeasonContinuityReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "parent-replay-read-authority").includes("PARENT_REPLAY_PUBLISHED_QUEUE_FILTER_MISSING"));
});

test("fails replay media consent and revocation when read-time consent suppression is weakened", () => {
  const sources = cloneSources();
  sources.familyReplayService = sources.familyReplayService.replace(
    "!consent.revoked_at",
    "true"
  );

  const result = verifyFamilySeasonContinuityReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "replay-media-consent-revocation").includes("REPLAY_MEDIA_GUARDIAN_CONSENT_MISSING"));
});

test("fails private engagement when the route stops using the verified parent actor", () => {
  const sources = cloneSources();
  sources.parentReplayEngagementRoute = sources.parentReplayEngagementRoute.replace(
    "parentUserId: auth.user.id",
    "parentUserId: String(body.parentUserId)"
  );

  const result = verifyFamilySeasonContinuityReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "private-replay-engagement").includes("REPLAY_ENGAGEMENT_ROUTE_SESSION_ACTOR_MISSING"));
});

test("fails season transition authority when fixed carry-forward scope is weakened", () => {
  const sources = cloneSources();
  sources.seasonTransitionMigration = sources.seasonTransitionMigration.replace(
    "array['child_display_identity', 'guardian_relationship']",
    "target_carry_forward_fields"
  );

  const result = verifyFamilySeasonContinuityReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "season-transition-authority").includes("SEASON_TRANSITION_FIXED_SCOPE_AND_AUDIT_MISSING"));
});

test("fails apply/revert/downstream refusal when downstream family media refusal is removed", () => {
  const sources = cloneSources();
  sources.seasonTransitionMigration = sources.seasonTransitionMigration.replaceAll(
    "parent_replay_family_media",
    "parent_replay_removed_media"
  );

  const result = verifyFamilySeasonContinuityReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "apply-revert-downstream-refusal").includes("SEASON_DOWNSTREAM_REFUSAL_MISSING"));
});
