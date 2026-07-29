import assert from "node:assert/strict";
import test from "node:test";

import {
  formatWeatherProviderReadinessReport,
  readRepositorySources,
  verifyWeatherProviderReadiness
} from "./verify-weather-provider-readiness.mjs";

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
  const result = verifyWeatherProviderReadiness(cloneSources());
  const report = formatWeatherProviderReadinessReport(result);

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
  assert.match(report, /local repository readiness proof only/);
  assert.match(report, /National Weather Service first, Open-Meteo fallback/);
  assert.match(report, /hosted weather credential proof/);
  assert.match(report, /provider sandbox\/webhook proof/);
  assert.match(report, /production acceptance/);
});

test("fails when weather provider order drifts away from NWS then Open-Meteo then Tomorrow.io", () => {
  const sources = cloneSources();
  sources.weatherIndex = sources.weatherIndex.replace(
    "nationalWeatherServiceProvider,\n  openMeteoProvider,\n  tomorrowIoProvider",
    "openMeteoProvider,\n  nationalWeatherServiceProvider,\n  tomorrowIoProvider"
  );

  const result = verifyWeatherProviderReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "weather-provider-chain").includes("WEATHER_PROVIDER_ORDER_DRIFT"));
});

test("fails when provider result draft enforcement is removed", () => {
  const sources = cloneSources();
  sources.weatherIndex = sources.weatherIndex.replace(
    "status: \"draft\"",
    "status: result.draft.status"
  );

  const result = verifyWeatherProviderReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "weather-provider-chain").includes("WEATHER_PROVIDER_DRAFT_ENFORCEMENT_MISSING"));
});

test("fails when draft route trusts a caller-supplied reviewer", () => {
  const sources = cloneSources();
  sources.draftRoute = sources.draftRoute.replace(
    "reviewerUserId: auth.user.id",
    "reviewerUserId: String(body.reviewerUserId)"
  );

  const result = verifyWeatherProviderReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "weather-draft-route").includes("WEATHER_DRAFT_ROUTE_SESSION_REVIEWER_MISSING"));
  assert.ok(codesFor(result, "weather-draft-route").includes("WEATHER_DRAFT_ROUTE_CALLER_REVIEWER_PRESENT"));
});

test("fails when weather draft provider-send separation is missing", () => {
  const sources = cloneSources();
  sources.operations = sources.operations.replace(
    "No parent notification was sent.",
    "Parent notification sent."
  );

  const result = verifyWeatherProviderReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "weather-provider-send-separation").includes("WEATHER_DRAFT_PROVIDER_SEND_SEPARATION_MISSING"));
});

test("fails when open-gate docs stop naming production acceptance", () => {
  const sources = cloneSources();
  for (const key of ["features", "capabilityMatrix", "workPlan", "taskBoard", "runbook", "agentflowBacklog"]) {
    sources[key] = sources[key].replaceAll("production acceptance", "launch readiness");
  }

  const result = verifyWeatherProviderReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "open-gates-documentation").includes("OPEN_GATE_PRODUCTION_ACCEPTANCE_MISSING"));
});
