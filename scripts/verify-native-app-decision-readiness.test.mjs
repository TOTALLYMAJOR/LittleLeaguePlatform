import assert from "node:assert/strict";
import test from "node:test";

import {
  formatNativeAppDecisionReadinessReport,
  readRepositorySources,
  verifyNativeAppDecisionReadiness,
} from "./verify-native-app-decision-readiness.mjs";

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
  const result = verifyNativeAppDecisionReadiness(cloneSources());
  const report = formatNativeAppDecisionReadinessReport(result);

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
  assert.match(report, /local repository readiness proof only/);
  assert.match(report, /mobile browser proof/);
  assert.match(report, /production usage metrics review/);
  assert.match(report, /Expo architecture review/);
  assert.match(report, /production native acceptance/);
});

test("fails PWA-first posture when tech-stack no longer names the responsive PWA as first shippable mobile experience", () => {
  const sources = cloneSources();
  sources.techStack = sources.techStack.replace(
    "The first shippable mobile experience should be a responsive PWA from the existing Next.js app.",
    "The first shippable mobile experience should be a native app.",
  );

  const result = verifyNativeAppDecisionReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "pwa-first-product-posture").includes("TECH_STACK_RESPONSIVE_PWA_FIRST_MISSING"));
});

test("fails install and standalone measurement when install prompt dismissal is no longer recorded", () => {
  const sources = cloneSources();
  sources.providers = sources.providers.replaceAll("install_prompt_dismissed", "install_prompt_closed");

  const result = verifyNativeAppDecisionReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "install-standalone-measurement").includes("INSTALL_METRIC_EVENTS_MISSING"));
});

test("fails mobile usage boundaries when native-interest telemetry is removed", () => {
  const sources = cloneSources();
  sources.mobileUsageRoute = sources.mobileUsageRoute.replaceAll("native_app_interest", "native_app_approved");
  sources.mobileUsageOperations = sources.mobileUsageOperations.replaceAll("native_app_interest", "native_app_approved");
  sources.mobileUsageMigration = sources.mobileUsageMigration.replaceAll("native_app_interest", "native_app_approved");

  const result = verifyNativeAppDecisionReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "mobile-usage-boundaries").includes("NATIVE_INTEREST_EVENT_MISSING"));
});

test("fails mobile usage boundaries when telemetry uses the registration rate-limit policy", () => {
  const sources = cloneSources();
  sources.mobileUsageRoute = sources.mobileUsageRoute.replace(
    "PUBLIC_RATE_LIMITS.mobileUsageEvents",
    "PUBLIC_RATE_LIMITS.registrationRequests",
  );

  const result = verifyNativeAppDecisionReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "mobile-usage-boundaries").includes("MOBILE_USAGE_RATE_LIMIT_MISSING"));
});

test("fails offline/PWA shell readiness when the service worker loses the offline route", () => {
  const sources = cloneSources();
  sources.serviceWorker = sources.serviceWorker.replaceAll("/offline", "/");

  const result = verifyNativeAppDecisionReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "offline-pwa-shell-readiness").includes("SERVICE_WORKER_OFFLINE_ROUTE_MISSING"));
});

test("fails native architecture guardrails when provider and child privacy reuse is removed from docs", () => {
  const sources = cloneSources();
  sources.workPlan = sources.workPlan.replaceAll(
    "provider gates, and child privacy rules",
    "new native policies",
  );

  const result = verifyNativeAppDecisionReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "native-architecture-guardrails").includes("EXPO_PROVIDER_PRIVACY_GATES_MISSING"));
});

test("fails open-gates documentation when production native acceptance is removed", () => {
  const sources = cloneSources();
  sources.runbook = sources.runbook.replaceAll("production native acceptance", "native launch");
  sources.workPlan = sources.workPlan.replaceAll("production native acceptance", "native launch");
  sources.taskBoard = sources.taskBoard.replaceAll("production native acceptance", "native launch");

  const result = verifyNativeAppDecisionReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "open-gates-documentation").includes("OPEN_GATE_PRODUCTION_NATIVE_ACCEPTANCE_MISSING"));
});
