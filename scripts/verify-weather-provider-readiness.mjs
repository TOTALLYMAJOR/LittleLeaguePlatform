#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_SOURCE_FILES = {
  packageJson: "package.json",
  weatherIndex: "lib/services/weather/index.ts",
  weatherTypes: "lib/services/weather/types.ts",
  nwsProvider: "lib/services/weather/national-weather-service.ts",
  openMeteoProvider: "lib/services/weather/open-meteo.ts",
  tomorrowProvider: "lib/services/weather/tomorrow-io.ts",
  weatherServiceTest: "lib/services/weather/weather.test.ts",
  draftRoute: "app/api/weather-alerts/draft/route.ts",
  operations: "lib/supabase/operations.ts",
  accessControl: "lib/supabase/access-control.ts",
  weatherDraftTest: "lib/supabase/weather-draft.test.ts",
  apiLiveActionsTest: "app/api-live-actions.test.ts",
  providerBoundaryTest: "app/provider-boundary.test.ts",
  features: "docs/Features.md",
  capabilityMatrix: "docs/capability-matrix.md",
  workPlan: "docs/missing-production-slices-work-plan.md",
  taskBoard: "docs/production-task-board.md",
  runbook: "docs/runbook.md",
  agentflowBacklog: "docs/agentflow-missing-production-backlog.md"
};

const OPEN_GATES = [
  "hosted weather credential proof",
  "fallback behavior",
  "signed-in coach/admin draft proof",
  "Supabase readback",
  "parent delivery",
  "provider sandbox/webhook proof",
  "realtime/offline behavior",
  "accessibility",
  "production acceptance"
];

function combined(sources, keys) {
  return keys.map((key) => sources[key] ?? "").join("\n\n");
}

function fileLabels(keys) {
  return keys.map((key) => DEFAULT_SOURCE_FILES[key] ?? key);
}

function addBlocker(blockers, family, code, keys, message) {
  blockers.push({
    family,
    code,
    paths: fileLabels(keys),
    message
  });
}

function requirePattern(blockers, sources, family, code, keys, pattern, message) {
  const text = combined(sources, keys);
  const ok = typeof pattern === "string" ? text.includes(pattern) : pattern.test(text);
  if (!ok) addBlocker(blockers, family, code, keys, message);
}

function requireNoPattern(blockers, sources, family, code, keys, pattern, message) {
  const text = combined(sources, keys);
  if (pattern.test(text)) addBlocker(blockers, family, code, keys, message);
}

export function readRepositorySources(rootDir = process.cwd(), sourceFiles = DEFAULT_SOURCE_FILES) {
  return Object.fromEntries(
    Object.entries(sourceFiles).map(([key, relativePath]) => [
      key,
      readFileSync(resolve(rootDir, relativePath), "utf8")
    ])
  );
}

function verifyPackageScript(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "local-command-boundary",
    "QA_SCRIPT_MISSING",
    ["packageJson"],
    /"qa:weather-provider-readiness":\s*"node scripts\/verify-weather-provider-readiness\.mjs"/,
    "package.json must expose the source-only weather provider readiness verifier."
  );
  requireNoPattern(
    blockers,
    sources,
    "local-command-boundary",
    "QA_SCRIPT_MUST_NOT_CALL_RUNTIME_PROOF",
    ["packageJson"],
    /"qa:weather-provider-readiness":\s*"[^"]*(playwright|vercel|supabase|docker|stripe|sendgrid|twilio|pingram|web-push)/i,
    "The weather readiness script must not chain hosted, provider, browser, Docker, payment, or Supabase commands."
  );
}

function verifyWeatherProviderChain(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "weather-provider-chain",
    "WEATHER_PROVIDER_ORDER_DRIFT",
    ["weatherIndex", "weatherServiceTest"],
    /weatherProviders:\s*WeatherProvider\[\]\s*=\s*\[[\s\S]*nationalWeatherServiceProvider,[\s\S]*openMeteoProvider,[\s\S]*tomorrowIoProvider[\s\S]*\][\s\S]*keeps Tomorrow\.io optional in the default provider order/s,
    "Weather providers must remain ordered as NWS first, Open-Meteo fallback, and Tomorrow.io last/optional."
  );
  requirePattern(
    blockers,
    sources,
    "weather-provider-chain",
    "WEATHER_PROVIDER_OPTIONAL_PREMIUM_DRIFT",
    ["tomorrowProvider", "weatherServiceTest"],
    /enabled:\s*\(config\)\s*=>\s*Boolean\(config\?\.tomorrowApiKey\)[\s\S]*getEnabledWeatherProviders\(\{ tomorrowApiKey: "tomorrow-key" \}\)/s,
    "Tomorrow.io must remain disabled unless a Tomorrow.io/weather provider API key is explicitly configured."
  );
  requirePattern(
    blockers,
    sources,
    "weather-provider-chain",
    "WEATHER_PROVIDER_FALLBACK_LOOP_MISSING",
    ["weatherIndex", "weatherServiceTest"],
    /for \(const provider of providers\)[\s\S]*if \(!provider\.enabled\(config\)\) continue;[\s\S]*await provider\.getEventWeather\(input, config\)[\s\S]*if \(result\) return enforceDraftWeatherResult\(result\)[\s\S]*falls back to Open-Meteo when National Weather Service has no usable forecast/s,
    "Provider lookup must try enabled providers in order and fall back before returning no forecast."
  );
  requirePattern(
    blockers,
    sources,
    "weather-provider-chain",
    "WEATHER_PROVIDER_DRAFT_ENFORCEMENT_MISSING",
    ["weatherIndex", "weatherServiceTest", "weatherDraftTest"],
    /function enforceDraftWeatherResult\(result: WeatherProviderForecast\): WeatherProviderForecast \{[\s\S]*status:\s*"draft"[\s\S]*always normalizes weather alerts as draft state[\s\S]*saves only draft weather alerts/s,
    "Every provider result must be forced back into draft alert state before persistence."
  );
}

function verifyDraftRouteAndSupabaseSeam(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "weather-draft-route",
    "WEATHER_DRAFT_ROUTE_SESSION_REVIEWER_MISSING",
    ["draftRoute", "apiLiveActionsTest"],
    /requireAuthenticatedRouteUser\(request\)[\s\S]*reviewerUserId:\s*auth\.user\.id[\s\S]*uses the authenticated coach session for weather alert drafts[\s\S]*reviewerUserId:\s*"user-live-session"/s,
    "Weather draft route must derive the reviewer from the verified Supabase session."
  );
  requireNoPattern(
    blockers,
    sources,
    "weather-draft-route",
    "WEATHER_DRAFT_ROUTE_CALLER_REVIEWER_PRESENT",
    ["draftRoute"],
    /reviewerUserId:\s*(?:String\()?body\./,
    "Weather draft route must not accept caller-supplied reviewer authority."
  );
  requirePattern(
    blockers,
    sources,
    "weather-draft-route",
    "WEATHER_DRAFT_ROUTE_EVENT_BOUNDARY_MISSING",
    ["draftRoute"],
    /eventId:\s*String\(body\.eventId \?\? ""\)/,
    "Weather draft route must pass only the requested event id plus the verified reviewer to the service seam."
  );
  requirePattern(
    blockers,
    sources,
    "weather-supabase-seam",
    "WEATHER_DRAFT_EVENT_TEAM_SCOPE_MISSING",
    ["operations", "weatherDraftTest"],
    /\.from\("events"\)[\s\S]*\.select\("id,organization_id,team_id,title,starts_at,location_name,location_address,latitude,longitude"\)[\s\S]*\.eq\("id", input\.eventId\)[\s\S]*teamId:\s*event\.team_id[\s\S]*eventId:\s*event\.id/s,
    "Supabase persistence must derive team/event scope from the stored event row before weather lookup and insert."
  );
  requirePattern(
    blockers,
    sources,
    "weather-supabase-seam",
    "WEATHER_DRAFT_PROVIDER_CONFIG_MISSING",
    ["operations", "weatherDraftTest"],
    /getWeatherEventDraft\([\s\S]*tomorrowApiKey:\s*process\.env\.TOMORROW_API_KEY \|\| process\.env\.WEATHER_PROVIDER_API_KEY[\s\S]*userAgent:\s*process\.env\.WEATHER_USER_AGENT/s,
    "Weather draft persistence must use the configured provider fallback seam rather than a direct provider call."
  );
  requirePattern(
    blockers,
    sources,
    "weather-supabase-seam",
    "WEATHER_DRAFT_INSERT_BOUNDARY_MISSING",
    ["operations", "weatherDraftTest"],
    /\.from\("weather_alerts"\)[\s\S]*\.insert\(\{[\s\S]*team_id:\s*event\.team_id[\s\S]*event_id:\s*event\.id[\s\S]*status:\s*"draft"[\s\S]*provider:\s*forecast\.providerId[\s\S]*provider_payload:\s*forecast\.raw[\s\S]*reviewed_by_user_id:\s*input\.reviewerUserId \?\? null[\s\S]*reviewed_at:\s*input\.reviewerUserId \? new Date\(\)\.toISOString\(\) : null/s,
    "Weather alert persistence must save only draft rows with provider provenance and reviewer audit attribution."
  );
  requirePattern(
    blockers,
    sources,
    "weather-supabase-seam",
    "WEATHER_DRAFT_COACH_ADMIN_AUTHORITY_CONTRACT_MISSING",
    ["accessControl", "apiLiveActionsTest", "workPlan", "taskBoard"],
    /(?=[\s\S]*requireActiveTeamCoachOrOrgAdmin)(?=[\s\S]*Only assigned coaches or org admins can)(?=[\s\S]*signed-in coach\/admin draft proof)(?=[\s\S]*coach\/admin authority)/s,
    "Local readiness must keep coach/admin weather authority explicit before hosted proof."
  );
  requirePattern(
    blockers,
    sources,
    "weather-supabase-seam",
    "WEATHER_DRAFT_IDEMPOTENT_AUDIT_CONTRACT_MISSING",
    ["operations", "workPlan", "taskBoard"],
    /reviewed_by_user_id[\s\S]*reviewed_at[\s\S]*idempotent\/auditable draft creation/s,
    "Weather draft creation must preserve reviewer audit fields and document idempotency as a local/hosted proof boundary."
  );
  requirePattern(
    blockers,
    sources,
    "weather-provider-send-separation",
    "WEATHER_DRAFT_PROVIDER_SEND_SEPARATION_MISSING",
    ["operations", "providerBoundaryTest", "features", "capabilityMatrix"],
    /No parent notification was sent[\s\S]*(?:not\.toContain\("fetch\("\)|without sending externally|no automatic provider send occurs|never executes external delivery)/s,
    "Weather draft creation must remain separate from parent notification/provider delivery."
  );
}

function verifyOpenGateDocs(sources, blockers) {
  const docKeys = ["features", "capabilityMatrix", "workPlan", "taskBoard", "runbook", "agentflowBacklog"];
  for (const gate of OPEN_GATES) {
    requirePattern(
      blockers,
      sources,
      "open-gates-documentation",
      `OPEN_GATE_${gate.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_MISSING`,
      docKeys,
      gate,
      `Docs must keep ${gate} as an open LP-016 gate.`
    );
  }
  const docs = combined(sources, docKeys);
  const localBoundaryPhrases = [
    "local repository readiness proof only",
    "does not call Supabase",
    "call weather providers",
    "deploy",
    "production acceptance"
  ];
  for (const phrase of localBoundaryPhrases) {
    if (!docs.includes(phrase)) {
      addBlocker(
        blockers,
        "open-gates-documentation",
        "WEATHER_LOCAL_READINESS_BOUNDARY_MISSING",
        docKeys,
        "Docs must distinguish local source readiness from hosted/provider/production acceptance."
      );
      break;
    }
  }
}

export function verifyWeatherProviderReadiness(sources = readRepositorySources()) {
  const blockers = [];
  verifyPackageScript(sources, blockers);
  verifyWeatherProviderChain(sources, blockers);
  verifyDraftRouteAndSupabaseSeam(sources, blockers);
  verifyOpenGateDocs(sources, blockers);

  return {
    ok: blockers.length === 0,
    checkedFiles: Object.values(DEFAULT_SOURCE_FILES),
    blockers
  };
}

export function formatWeatherProviderReadinessReport(result) {
  const lines = [];
  lines.push("Weather provider action readiness verifier");
  lines.push("");
  lines.push(`Status: ${result.ok ? "PASS" : "FAIL"}`);
  lines.push(`Checked ${result.checkedFiles.length} repository files without credentials, network access, Supabase calls, browser automation, provider sends, provider dashboard calls, deployment, or hosted mutation.`);
  lines.push("Proof boundary: local repository readiness proof only.");
  lines.push("");

  if (result.ok) {
    lines.push("Covered local source contracts:");
    lines.push("- Provider order remains National Weather Service first, Open-Meteo fallback, and Tomorrow.io optional/premium.");
    lines.push("- Provider results are forced back to draft state before weather alert persistence.");
    lines.push("- Draft route derives reviewer authority from the authenticated Supabase session.");
    lines.push("- Supabase seam keeps event/team scope, provider fallback, draft/audit persistence, and provider-send separation visible.");
  } else {
    lines.push("Blockers:");
    for (const blocker of result.blockers) {
      lines.push(`- [${blocker.family}/${blocker.code}] ${blocker.message}`);
      lines.push(`  Paths: ${blocker.paths.join(", ")}`);
    }
  }

  lines.push("");
  lines.push("Open gates still requiring separate proof:");
  for (const gate of OPEN_GATES) lines.push(`- ${gate}`);
  lines.push("");
  lines.push("This verifier reads repository files only. It does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, call weather providers, call provider dashboards, create provider sends, send email, SMS, push, or Stripe requests, configure secrets, deploy, or claim hosted/provider/production acceptance.");

  return lines.join("\n");
}

function main() {
  const result = verifyWeatherProviderReadiness(readRepositorySources());
  console.log(formatWeatherProviderReadinessReport(result));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
