import assert from "node:assert/strict";
import test from "node:test";

import {
  formatProviderSandboxReadinessReport,
  readRepositorySources,
  verifyProviderSandboxReadiness
} from "./verify-provider-sandbox-readiness.mjs";

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
  const result = verifyProviderSandboxReadiness(cloneSources());
  const report = formatProviderSandboxReadinessReport(result);

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
  assert.match(report, /local repository readiness proof only/);
  assert.match(report, /real sandbox email, SMS, and Web Push sends/);
  assert.match(report, /provider dashboard setup/);
  assert.match(report, /signed webhook endpoint registration/);
  assert.match(report, /production-send approval/);
});

test("fails provider approval authority when the reviewer no longer comes from the verified session", () => {
  const sources = cloneSources();
  sources.reviewRoute = sources.reviewRoute.replace(
    "actorUserId: auth.user.id",
    "actorUserId: String(body.actorUserId)"
  );

  const result = verifyProviderSandboxReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "provider-approval-authority").includes("PROVIDER_REVIEW_SESSION_ACTOR_MISSING"));
});

test("fails sandbox adapter binding when last-moment idempotency binding is weakened", () => {
  const sources = cloneSources();
  sources.providerDelivery = sources.providerDelivery.replace(
    "attempt.idempotency_key === payload.idempotencyKey",
    "true"
  );

  const result = verifyProviderSandboxReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "sandbox-adapter-binding").includes("WORKER_PAYLOAD_BINDING_MISSING"));
});

test("fails suppression and allowlist controls when the QA recipient allowlist is removed", () => {
  const sources = cloneSources();
  sources.adapters = sources.adapters.replaceAll(
    "PROVIDER_QA_RECIPIENT_ALLOWLIST",
    "PROVIDER_RECIPIENT_LIST"
  );

  const result = verifyProviderSandboxReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "suppression-allowlist-cost-controls").includes("PROVIDER_ALLOWLIST_MISSING"));
});

test("fails webhook security when Pingram timestamp/HMAC verification no longer uses constant-time comparison", () => {
  const sources = cloneSources();
  sources.webhookVerification = sources.webhookVerification.replace(
    "received.length === expected.length && timingSafeEqual(received, expected)",
    "received.toString(\"hex\") === expected.toString(\"hex\")"
  );

  const result = verifyProviderSandboxReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "webhook-security").includes("PINGRAM_WEBHOOK_HMAC_REPLAY_MISSING"));
});

test("fails delivery truth separation when accepted is treated as delivered", () => {
  const sources = cloneSources();
  sources.executor = sources.executor.replace(
    "Accepted does not mean delivered.",
    "Accepted means delivered."
  );

  const result = verifyProviderSandboxReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "delivery-truth-separation").includes("ACCEPTED_NOT_DELIVERED_BOUNDARY_MISSING"));
});

test("fails open-gates documentation when production-send approval is removed", () => {
  const sources = cloneSources();
  sources.runbook = sources.runbook.replaceAll("production-send approval", "launch approval");
  sources.workPlan = sources.workPlan.replaceAll("production-send approval", "launch approval");
  sources.taskBoard = sources.taskBoard.replaceAll("production-send approval", "launch approval");

  const result = verifyProviderSandboxReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "open-gates-documentation").includes("OPEN_GATE_PRODUCTION_SEND_APPROVAL_MISSING"));
});
