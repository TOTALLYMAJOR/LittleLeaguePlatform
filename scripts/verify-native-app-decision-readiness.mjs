#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_SOURCE_FILES = {
  techStack: "docs/tech-stack.md",
  userManual: "docs/user-manual.md",
  runbook: "docs/runbook.md",
  workPlan: "docs/missing-production-slices-work-plan.md",
  taskBoard: "docs/production-task-board.md",
  providers: "app/providers.tsx",
  mobileUsageRoute: "app/api/mobile-usage-events/route.ts",
  mobileUsageOperations: "lib/supabase/operations.ts",
  mobileUsageMigration: "supabase/migrations/0010_mobile_decision_metrics.sql",
  mobileUsageRlsMigration: "supabase/migrations/20260726182645_optimize_rls_auth_initplans.sql",
  apiAuthTest: "app/api-auth.test.ts",
  apiLiveActionsTest: "app/api-live-actions.test.ts",
  publicRateLimiter: "lib/supabase/public-rate-limit.ts",
  publicRateLimitMigration: "supabase/migrations/20260729144500_public_rate_limits.sql",
  publicIntakeRateLimitTest: "app/public-intake-rate-limit.test.ts",
  manifest: "public/manifest.webmanifest",
  serviceWorker: "public/sw.js",
  appShell: "components/ui/AppShell.tsx",
  layout: "app/layout.tsx",
  routesSmokeTest: "app/routes-smoke.test.ts",
  conceptScorecard: "components/ui/concept-scorecard.ts",
};

const OPEN_GATES = [
  "mobile browser proof",
  "production usage metrics review",
  "push permission proof",
  "offline/reconnect proof",
  "native product approval",
  "Expo architecture review",
  "app-store compliance review",
  "accessibility proof",
  "production native acceptance",
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
    message,
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
      readFileSync(resolve(rootDir, relativePath), "utf8"),
    ]),
  );
}

function verifyPwaFirstProductPosture(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "pwa-first-product-posture",
    "TECH_STACK_RESPONSIVE_PWA_FIRST_MISSING",
    ["techStack"],
    /first shippable mobile experience[\s\S]*responsive PWA[\s\S]*existing Next\.js app/s,
    "docs/tech-stack.md must say the first shippable mobile experience is the responsive PWA from the existing Next.js app.",
  );
  requirePattern(
    blockers,
    sources,
    "pwa-first-product-posture",
    "TECH_STACK_NATIVE_JUSTIFICATION_SET_MISSING",
    ["techStack"],
    /native Expo app[\s\S]*only after[\s\S]*(app-store distribution|app-store)[\s\S]*(stronger native push|stronger push)[\s\S]*(camera\/media|camera\/media workflows)[\s\S]*(native OS integrations|OS integration)[\s\S]*(PWA limitations are real|PWA proves usage patterns|offline fallback)/s,
    "docs/tech-stack.md must keep Expo/native justified only by real app-store, camera/media, stronger push, OS integration, or offline requirements the PWA cannot meet.",
  );
  requirePattern(
    blockers,
    sources,
    "pwa-first-product-posture",
    "USER_MANUAL_EXPO_DEFERRED_MISSING",
    ["userManual"],
    /Expo\/native app distribution remains a later decision unless PWA usage proves insufficient/s,
    "The user manual must keep Expo/native distribution deferred until PWA usage proves insufficient.",
  );
}

function verifyInstallStandaloneMeasurement(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "install-standalone-measurement",
    "INSTALL_EVENTS_LISTENERS_MISSING",
    ["providers"],
    /addEventListener\("beforeinstallprompt"[\s\S]*addEventListener\("appinstalled"[\s\S]*removeEventListener\("beforeinstallprompt"[\s\S]*removeEventListener\("appinstalled"/s,
    "app/providers.tsx must listen for beforeinstallprompt and appinstalled and clean up both listeners.",
  );
  requirePattern(
    blockers,
    sources,
    "install-standalone-measurement",
    "INSTALL_VALUE_GATE_MISSING",
    ["providers"],
    /INSTALL_VALUE_EVENT[\s\S]*INSTALL_VALUE_KEY[\s\S]*markLeaguePilotValueExperienced[\s\S]*hasExperiencedValue[\s\S]*valueGate:\s*true/s,
    "Install prompt eligibility must stay gated on the LeaguePilot value-event key before recording or showing the prompt.",
  );
  requirePattern(
    blockers,
    sources,
    "install-standalone-measurement",
    "INSTALL_METRIC_EVENTS_MISSING",
    ["providers"],
    /(?=[\s\S]*recordMobileUsageEvent\("install_prompt_shown")(?=[\s\S]*recordMobileUsageEvent\("install_prompt_accepted")(?=[\s\S]*recordMobileUsageEvent\("install_prompt_dismissed")(?=[\s\S]*recordMobileUsageEvent\("standalone_launch")/s,
    "Install and standalone measurement must record shown, accepted, dismissed, and standalone_launch outcomes.",
  );
  requirePattern(
    blockers,
    sources,
    "install-standalone-measurement",
    "MOBILE_USAGE_POST_MISSING",
    ["providers"],
    /const url = "\/api\/mobile-usage-events"[\s\S]*(navigator\.sendBeacon|fetch\(url)/s,
    "Install and standalone metrics must post to /api/mobile-usage-events without external analytics SDKs.",
  );
}

function verifyMobileUsageBoundaries(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "mobile-usage-boundaries",
    "NATIVE_INTEREST_EVENT_MISSING",
    ["mobileUsageRoute", "mobileUsageOperations", "mobileUsageMigration"],
    /const eventTypes[\s\S]*"native_app_interest"[\s\S]*\|\s*"native_app_interest"[\s\S]*'native_app_interest'/s,
    "/api/mobile-usage-events, its typed Supabase adapter boundary, and its migration must allow a native-interest event type without turning it into product approval.",
  );
  requireNoPattern(
    blockers,
    sources,
    "mobile-usage-boundaries",
    "MOBILE_USAGE_AUTH_REQUIRED",
    ["mobileUsageRoute"],
    /requireAuthenticatedRouteUser/,
    "Mobile usage intake must remain anonymous-safe and must not require sign-in for PWA/native decision telemetry.",
  );
  requirePattern(
    blockers,
    sources,
    "mobile-usage-boundaries",
    "MOBILE_USAGE_ANONYMOUS_INSERT_MISSING",
    ["mobileUsageOperations", "mobileUsageMigration", "mobileUsageRlsMigration"],
    /insert\(\{[\s\S]*event_type:[\s\S]*route_path:[\s\S]*user_agent:[\s\S]*metadata:[\s\S]*user_id is null[\s\S]*user_id = \(select auth\.uid\(\)\)/s,
    "Mobile usage writes must remain anonymous-safe and RLS-compatible, with nullable user_id rather than implied approval or access grants.",
  );
  requirePattern(
    blockers,
    sources,
    "mobile-usage-boundaries",
    "MOBILE_USAGE_RATE_LIMIT_MISSING",
    ["publicRateLimiter", "publicRateLimitMigration", "mobileUsageRoute", "publicIntakeRateLimitTest"],
    /PUBLIC_RATE_LIMITS[\s\S]*mobileUsageEvents:[\s\S]*routeKey:\s*"mobile-usage-events"[\s\S]*limit:\s*120[\s\S]*windowMs:\s*60_000[\s\S]*\.rpc\("claim_public_rate_limit"[\s\S]*create or replace function public\.claim_public_rate_limit[\s\S]*to service_role[\s\S]*applyPublicRateLimit\(request,\s*PUBLIC_RATE_LIMITS\.mobileUsageEvents\)[\s\S]*throttles anonymous mobile telemetry bursts per client IP/s,
    "Mobile usage intake must stay protected by the durable service-only public rate limiter and burst tests.",
  );
  requirePattern(
    blockers,
    sources,
    "mobile-usage-boundaries",
    "MOBILE_USAGE_API_TESTS_MISSING",
    ["apiAuthTest", "apiLiveActionsTest"],
    /keeps anonymous mobile usage measurement open for PWA decision data[\s\S]*records public mobile usage events for PWA\/native decisions/s,
    "API tests must cover the anonymous-safe auth boundary and live route action for PWA/native decision telemetry.",
  );
}

function verifyOfflinePwaShellReadiness(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "offline-pwa-shell-readiness",
    "MANIFEST_STANDALONE_MISSING",
    ["manifest", "layout"],
    /"start_url": "\/"[\s\S]*"scope": "\/"[\s\S]*"display": "standalone"[\s\S]*manifest:\s*(?:"\/manifest\.webmanifest"|versionedPwaAsset\("\/manifest\.webmanifest",\s*PWA_MANIFEST_REVISION\))/s,
    "The web manifest and root layout must keep the app installable as a standalone PWA.",
  );
  requirePattern(
    blockers,
    sources,
    "offline-pwa-shell-readiness",
    "SERVICE_WORKER_OFFLINE_ROUTE_MISSING",
    ["serviceWorker"],
    /const OFFLINE_URL = "\/offline\.html"[\s\S]*NEVER_CACHE_DYNAMIC_ROUTES\s*=\s*\["\/offline"\][\s\S]*["'`]\/manifest\.webmanifest(?:\?v=\$\{PWA_MANIFEST_REVISION\})?["'`][\s\S]*OFFLINE_URL[\s\S]*networkFirstNavigation[\s\S]*caches\.match\(OFFLINE_URL\)/s,
    "The service worker must keep private navigation network-first, exclude /offline from dynamic caching, and fall back to the static offline shell.",
  );
  requireNoPattern(
    blockers,
    sources,
    "offline-pwa-shell-readiness",
    "SERVICE_WORKER_PRIVATE_HTML_CACHE_PRESENT",
    ["serviceWorker"],
    /"\/(parent|coach|admin)"/,
    "The service worker must not cache private parent, coach, or admin HTML as static shell content.",
  );
  requirePattern(
    blockers,
    sources,
    "offline-pwa-shell-readiness",
    "APP_SHELL_MOBILE_OFFLINE_MISSING",
    ["appShell", "conceptScorecard"],
    /(?=[\s\S]*addEventListener\("online")(?=[\s\S]*addEventListener\("offline")(?=[\s\S]*offline-banner)(?=[\s\S]*mobile-tabbar)(?=[\s\S]*Offline indicator banner)(?=[\s\S]*Install prompt bottom sheet)/s,
    "The App Shell and concept scorecard must expose offline status, mobile navigation, and install/offline PWA concepts.",
  );
  requirePattern(
    blockers,
    sources,
    "offline-pwa-shell-readiness",
    "ROUTE_SMOKE_PWA_WIRING_MISSING",
    ["routesSmokeTest"],
    /PWA offline fallback route wired into the service worker[\s\S]*PWA install and standalone usage measurement wired[\s\S]*global app shell wired for accessible navigation and PWA state/s,
    "Route-smoke tests must prove manifest, service worker, install/standalone metrics, and PWA shell wiring.",
  );
}

function verifyNativeArchitectureGuardrails(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "native-architecture-guardrails",
    "EXPO_REUSE_DOMAIN_CONTRACTS_MISSING",
    ["techStack", "workPlan"],
    /Expo[\s\S]*(Reuse|reuse)[\s\S]*(domain types|domain models|domain contracts)[\s\S]*(service contracts|Supabase session\/RLS boundaries)/s,
    "Documentation must require any approved Expo app to reuse existing domain contracts and Supabase session/RLS boundaries.",
  );
  requirePattern(
    blockers,
    sources,
    "native-architecture-guardrails",
    "EXPO_PROVIDER_PRIVACY_GATES_MISSING",
    ["techStack", "workPlan"],
    /(?=[\s\S]*provider gates)(?=[\s\S]*child privacy rules)(?=[\s\S]*Children do not log in)(?=[\s\S]*Child names stay first name plus last initial)/s,
    "Documentation must carry provider gates and child privacy rules into any future native architecture.",
  );
  requirePattern(
    blockers,
    sources,
    "native-architecture-guardrails",
    "EXPO_EVIDENCE_DEFERRED_MISSING",
    ["techStack", "workPlan", "taskBoard"],
    /Expo remains deferred[\s\S]*(evidence|usage|PWA usage|PWA evidence)[\s\S]*(justifies|proves|justify)/s,
    "Expo/native work must stay deferred until evidence justifies the extra platform.",
  );
  requireNoPattern(
    blockers,
    sources,
    "native-architecture-guardrails",
    "EXPO_SCAFFOLD_PRESENT",
    ["techStack", "workPlan", "taskBoard"],
    /\bnpx create-expo-app\b|\beas build\b|\bapp\.json\b.*\bexpo\b/s,
    "Local native-decision readiness must not scaffold Expo, register app stores, or imply native builds are approved.",
  );
}

function verifyOpenGatesDocumentation(sources, blockers) {
  for (const gate of OPEN_GATES) {
    requirePattern(
      blockers,
      sources,
      "open-gates-documentation",
      `OPEN_GATE_${gate.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/_$/, "")}_MISSING`,
      ["runbook", "workPlan", "taskBoard"],
      gate,
      `Docs must explicitly keep "${gate}" open after local native-decision readiness proof.`,
    );
  }
  requirePattern(
    blockers,
    sources,
    "open-gates-documentation",
    "LOCAL_ONLY_NATIVE_VERIFIER_BOUNDARY_MISSING",
    ["runbook", "workPlan", "taskBoard"],
    /qa:native-app-decision-readiness[\s\S]*local repository readiness proof only[\s\S]*does not call Supabase[\s\S]*scaffold Expo[\s\S]*claim PWA\/mobile browser, production usage, push-provider, app-store, native, or production acceptance/s,
    "Docs must define qa:native-app-decision-readiness as local repository readiness proof only with no hosted/provider/native acceptance claims.",
  );
}

export function verifyNativeAppDecisionReadiness(sources) {
  const blockers = [];
  const allKeys = Object.keys(DEFAULT_SOURCE_FILES);
  for (const key of allKeys) {
    if (typeof sources[key] !== "string") {
      addBlocker(blockers, "source", "SOURCE_FILE_MISSING", [key], "Required source file was not supplied to the verifier.");
    }
  }

  verifyPwaFirstProductPosture(sources, blockers);
  verifyInstallStandaloneMeasurement(sources, blockers);
  verifyMobileUsageBoundaries(sources, blockers);
  verifyOfflinePwaShellReadiness(sources, blockers);
  verifyNativeArchitectureGuardrails(sources, blockers);
  verifyOpenGatesDocumentation(sources, blockers);

  return {
    ok: blockers.length === 0,
    checkedFiles: allKeys.map((key) => DEFAULT_SOURCE_FILES[key]),
    blockers,
    families: [
      "pwa-first-product-posture",
      "install-standalone-measurement",
      "mobile-usage-boundaries",
      "offline-pwa-shell-readiness",
      "native-architecture-guardrails",
      "open-gates-documentation",
    ],
    proofBoundary: "local repository readiness proof only",
    openGates: OPEN_GATES,
    statement: "qa:native-app-decision-readiness is local repository readiness proof only. It reads repository files and does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, collect real analytics, request push permissions, register app stores, scaffold Expo, send providers, upload media, deploy, configure secrets, or claim PWA/mobile browser, production usage, push-provider, app-store, native, or production acceptance.",
  };
}

export function formatNativeAppDecisionReadinessReport(result) {
  const lines = [
    "LPM-012 native app decision readiness verifier",
    result.ok ? "Status: PASS" : "Status: FAIL",
    "",
    result.statement,
    "",
    `Checked ${result.checkedFiles.length} repository files.`,
    `Verified families: ${result.families.join(", ")}.`,
    "",
    "Open gates before native decision closure:",
    ...result.openGates.map((gate) => `- ${gate}`),
  ];

  if (!result.ok) {
    lines.push("", "Named blockers:");
    for (const blocker of result.blockers) {
      lines.push(
        `- ${blocker.code} [${blocker.family}]`,
        `  Paths: ${blocker.paths.join(", ")}`,
        `  ${blocker.message}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

export function runNativeAppDecisionReadinessCli(
  rootDir = process.cwd(),
  streams = { stdout: process.stdout, stderr: process.stderr },
) {
  const result = verifyNativeAppDecisionReadiness(readRepositorySources(rootDir));
  const report = formatNativeAppDecisionReadinessReport(result);
  if (result.ok) {
    streams.stdout.write(report);
    return 0;
  }
  streams.stderr.write(report);
  return 1;
}

function main() {
  process.exitCode = runNativeAppDecisionReadinessCli();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
