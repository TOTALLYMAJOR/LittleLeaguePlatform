import assert from "node:assert/strict";
import test from "node:test";

import {
  formatPrivateMediaStorageReadinessReport,
  readRepositorySources,
  verifyPrivateMediaStorageReadiness
} from "./verify-private-media-storage-readiness.mjs";

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
  const result = verifyPrivateMediaStorageReadiness(cloneSources());
  const report = formatPrivateMediaStorageReadinessReport(result);

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
  assert.match(report, /local repository-source readiness proof only/);
  assert.match(report, /storage-provider setup/);
  assert.match(report, /scanner-provider setup/);
  assert.match(report, /hosted signed-upload proof/);
  assert.match(report, /hosted scan proof/);
  assert.match(report, /populated consent\/revocation proof/);
  assert.match(report, /deletion\/retention proof/);
  assert.match(report, /abuse\/takedown proof/);
  assert.match(report, /accessibility proof/);
  assert.match(report, /production acceptance/);
});

test("fails upload gates and authority when the media feature flag contract is weakened", () => {
  const sources = cloneSources();
  sources.privateMediaService = sources.privateMediaService.replace(
    'feature: "media_uploads"',
    'feature: "provider_sends"'
  );

  const result = verifyPrivateMediaStorageReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "upload-gates-authority").includes("UPLOAD_GATE_MEDIA_FEATURE_FLAG_MISSING"));
});

test("fails tenant quarantine storage when object paths are no longer quarantined", () => {
  const sources = cloneSources();
  sources.privateMediaService = sources.privateMediaService.replace(
    "/quarantine/",
    "/uploads/"
  );

  const result = verifyPrivateMediaStorageReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "tenant-quarantine-storage").includes("QUARANTINE_TENANT_PATH_MISSING"));
});

test("fails scanner processing evidence when scanner hash binding is removed", () => {
  const sources = cloneSources();
  sources.privateMediaService = sources.privateMediaService.replace(
    '"x-content-sha256": input.sha256',
    '"x-content-sha256": ""'
  );

  const result = verifyPrivateMediaStorageReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "scanner-processing-evidence").includes("SCANNER_ENDPOINT_TOKEN_PROVIDER_MISSING"));
});

test("fails family release and read privacy when current consent revocation is ignored", () => {
  const sources = cloneSources();
  sources.privateMediaService = sources.privateMediaService.replace(
    '.is("revoked_at", null)',
    '.not("revoked_at", "is", null)'
  );

  const result = verifyPrivateMediaStorageReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "family-release-read-privacy").includes("FAMILY_RELEASE_CONSENT_MISSING"));
});

test("fails retention deletion and takedown evidence when deletion evidence is removed", () => {
  const sources = cloneSources();
  sources.operationalTruthMigration = sources.operationalTruthMigration.replace(
    "storage_deletion_evidence_json",
    "storage_deletion_notes_json"
  );

  const result = verifyPrivateMediaStorageReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "retention-deletion-takedown-evidence").includes("RETENTION_STORAGE_DELETION_EVIDENCE_MISSING"));
});

test("fails open gates documentation when production acceptance is omitted", () => {
  const sources = cloneSources();
  sources.runbook = sources.runbook.replaceAll("production acceptance", "launch readiness");
  sources.workPlan = sources.workPlan.replaceAll("production acceptance", "launch readiness");
  sources.taskBoard = sources.taskBoard.replaceAll("production acceptance", "launch readiness");

  const result = verifyPrivateMediaStorageReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "open-gates-documentation").includes("OPEN_GATE_PRODUCTION_ACCEPTANCE_MISSING"));
});
