#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_SOURCE_FILES = {
  mediaReportRoute: "app/api/media/report/route.ts",
  mediaModerationRoute: "app/api/media/moderation/route.ts",
  operations: "lib/supabase/operations.ts",
  mediaGovernance: "lib/supabase/media-governance.ts",
  featurePanels: "components/feature-panels.tsx",
  liveActionsTest: "app/api-live-actions.test.ts",

  seasonPlanning: "lib/domain/season-planning.ts",
  domainTest: "lib/domain/domain.test.ts",
  teamBuilderMigration: "supabase/migrations/0017_sponsor_billing_and_team_builder.sql",
  rlsPolicyTest: "supabase/rls-policy.test.ts",

  adminExportRoute: "app/api/admin/exports/route.ts",
  reporting: "lib/supabase/reporting.ts",
  reportingTest: "lib/supabase/reporting.test.ts",

  publicIntakeLimiter: "lib/supabase/public-rate-limit.ts",
  publicIntakeMigration: "supabase/migrations/20260729144500_public_rate_limits.sql",
  registrationRoute: "app/api/registration-requests/route.ts",
  mobileUsageRoute: "app/api/mobile-usage-events/route.ts",
  publicIntakeRateLimitTest: "app/public-intake-rate-limit.test.ts"
};

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

function verifyMediaReport(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "media-report",
    "MEDIA_REPORT_SESSION_ACTOR_MISSING",
    ["mediaReportRoute", "liveActionsTest"],
    /requireAuthenticatedRouteUser\s*\([\s\S]*reportMediaItem\s*\([\s\S]*reporterUserId:\s*auth\.user\.id[\s\S]*reporterUserId:\s*"user-live-session"/s,
    "Media reports must derive the reporter from the verified route session, not request body identity."
  );
  requirePattern(
    blockers,
    sources,
    "media-report",
    "MEDIA_REPORT_OPERATION_LAYER_MISSING",
    ["mediaReportRoute", "operations"],
    /import\s+\{\s*reportMediaItem\s*\}\s+from\s+"@\/lib\/supabase\/operations"[\s\S]*export\s+async\s+function\s+reportMediaItem/s,
    "The report route must delegate to the Supabase operation layer."
  );
  requirePattern(
    blockers,
    sources,
    "media-report",
    "MEDIA_REPORT_TEAM_SCOPE_MISSING",
    ["operations"],
    /\.from\("team_memberships"\)[\s\S]*\.eq\("team_id",\s*mediaItem\.team_id\)[\s\S]*\.eq\("user_id",\s*input\.reporterUserId\)[\s\S]*\.eq\("status",\s*"active"\)[\s\S]*\.from\("organization_memberships"\)[\s\S]*\.eq\("organization_id",\s*team\?\.organization_id\s*\?\?\s*""\)[\s\S]*\.eq\("role",\s*"admin"\)[\s\S]*Only assigned team members can report team media/s,
    "Media reports must require active team membership or active organization-admin scope for the media item's team."
  );
  requirePattern(
    blockers,
    sources,
    "media-report",
    "MEDIA_REPORT_STATE_TRANSITION_MISSING",
    ["operations"],
    /report_count:\s*\(mediaItem\.report_count\s*\?\?\s*0\)\s*\+\s*1[\s\S]*moderation_status:\s*"pending"[\s\S]*action:\s*"media_reported"/s,
    "Media reports must increment report count, move the item into moderation, and write audit evidence."
  );
  requirePattern(
    blockers,
    sources,
    "media-report",
    "MEDIA_REPORT_RETURN_SHAPE_MISSING",
    ["operations"],
    /\.update\(\{[\s\S]*report_count:[\s\S]*moderation_status:\s*"pending"[\s\S]*\.eq\("id",\s*input\.mediaItemId\)[\s\S]*\.select\("id,title,moderation_status,report_count"\)/s,
    "Media report results must return only the targeted item's bounded moderation fields."
  );
  requireNoPattern(
    blockers,
    sources,
    "media-report",
    "MEDIA_REPORT_PRIVATE_FIELD_LEAK",
    ["operations"],
    /reportMediaItem[\s\S]*\.select\("id,title,moderation_status,report_count,[^"]*(?:url|private_object_path|organization_id|team_id)/s,
    "Media report responses must not expose URLs, private object paths, or unrelated tenant/team identifiers."
  );
}

function verifyMediaModeration(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "media-moderation",
    "MEDIA_MODERATION_SESSION_ACTOR_MISSING",
    ["mediaModerationRoute", "liveActionsTest"],
    /requireAuthenticatedRouteUser\s*\([\s\S]*moderateMediaItem\s*\([\s\S]*reviewerUserId:\s*auth\.user\.id[\s\S]*reviewerUserId:\s*"user-live-session"/s,
    "Media moderation must derive the reviewer from the verified route session, not request body identity."
  );
  requirePattern(
    blockers,
    sources,
    "media-moderation",
    "MEDIA_MODERATION_ALLOWED_DECISIONS_MISSING",
    ["mediaModerationRoute", "operations"],
    /new\s+Set\(\["approved",\s*"hidden"\]\)[\s\S]*status:\s*"approved"\s*\|\s*"hidden"/s,
    "MVP media moderation must retain only bounded restore and hide decisions."
  );
  requirePattern(
    blockers,
    sources,
    "media-moderation",
    "MEDIA_MODERATION_HIDE_RESTORE_UI_MISSING",
    ["featurePanels"],
    /status === "hidden"[\s\S]*Restore media[\s\S]*Hide media/s,
    "The link-media workbench must expose one state-dependent hide or restore control."
  );
  requireNoPattern(
    blockers,
    sources,
    "media-moderation",
    "MEDIA_MODERATION_POSTPONED_CONTROLS_PRESENT",
    ["featurePanels"],
    />Approve media<|>Reject media<|>Remove media</,
    "Reject, destructive remove, and separate approval controls are postponed from the MVP link-media workbench."
  );
  requirePattern(
    blockers,
    sources,
    "media-moderation",
    "MEDIA_MODERATION_SCOPE_MISSING",
    ["operations"],
    /\.from\("team_memberships"\)[\s\S]*\.eq\("team_id",\s*mediaItem\.team_id\)[\s\S]*\.eq\("user_id",\s*input\.reviewerUserId\)[\s\S]*\.in\("role",\s*\["coach",\s*"admin"\]\)[\s\S]*\.from\("organization_memberships"\)[\s\S]*\.eq\("organization_id",\s*mediaItem\.organization_id\)[\s\S]*Only assigned coaches or org admins can moderate media/s,
    "Media moderation must be limited to assigned coaches/admins or active organization admins for the media item."
  );
  requirePattern(
    blockers,
    sources,
    "media-moderation",
    "MEDIA_MODERATION_EVIDENCE_MISSING",
    ["operations"],
    /media_review_history[\s\S]*previous_values_json[\s\S]*next_values_json[\s\S]*consent_evidence_json[\s\S]*audit_events[\s\S]*action:\s*`media_\$\{input\.status\}`/s,
    "Media moderation must preserve review history, consent evidence, and audit evidence."
  );
  requirePattern(
    blockers,
    sources,
    "media-moderation",
    "MEDIA_MODERATION_SCOPED_UPDATE_MISSING",
    ["operations"],
    /\.from\("media_items"\)[\s\S]*\.select\("id,organization_id,team_id,title,private_object_path,scan_completed_at,family_release_approved_at,moderation_status,visibility"\)[\s\S]*\.eq\("id",\s*input\.mediaItemId\)[\s\S]*\.update\(updatePayload\)[\s\S]*\.eq\("id",\s*input\.mediaItemId\)/s,
    "Media moderation must load and update only the targeted media item while preserving team and organization scope."
  );
}

function verifyTeamBuilderPublish(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "team-builder-publish",
    "TEAM_BUILDER_WORKFLOW_MISSING",
    ["seasonPlanning", "domainTest"],
    /workflow:\s*BalancedTeamBuildPreview\["workflow"\]\s*=\s*\["Preview",\s*"Edit",\s*"Approve",\s*"Publish"\][\s\S]*preview\.workflow\.join\(" -> "\)\)\.toBe\("Preview -> Edit -> Approve -> Publish"\)/s,
    "Team-builder readiness must keep the Preview -> Edit -> Approve -> Publish workflow under test."
  );
  requirePattern(
    blockers,
    sources,
    "team-builder-publish",
    "TEAM_BUILDER_ADMIN_AUDIT_MISSING",
    ["seasonPlanning", "domainTest"],
    /actor\?\.role\s*!==\s*"admin"[\s\S]*automatic_team_build_published[\s\S]*auditEvents:\s*\[auditEvent,\s*\.{3}state\.auditEvents\][\s\S]*published\.state\.auditEvents\[0\]\?\.action\)\.toBe\("automatic_team_build_published"\)/s,
    "Team-builder publish must remain admin-only and emit audit proof."
  );
  requirePattern(
    blockers,
    sources,
    "team-builder-publish",
    "TEAM_BUILDER_PLAN_PERSISTENCE_MISSING",
    ["teamBuilderMigration", "rlsPolicyTest"],
    /create table if not exists public\.team_build_plans[\s\S]*organization_id uuid not null[\s\S]*season_id uuid not null[\s\S]*status text not null default 'preview' check \(status in \('preview', 'edited', 'approved', 'published'\)\)[\s\S]*assignments jsonb[\s\S]*organization admins manage team build plans/s,
    "Team-build plans must retain persisted lifecycle, assignments, organization scope, and admin-only RLS proof."
  );
  requirePattern(
    blockers,
    sources,
    "team-builder-publish",
    "TEAM_BUILDER_SCOPE_INDEX_MISSING",
    ["teamBuilderMigration", "rlsPolicyTest"],
    /idx_team_build_plans_org_season_division[\s\S]*team_build_plans\(organization_id,\s*season_id,\s*division\)[\s\S]*expect\(sponsorBillingAndTeamBuilder\)\.toContain\("organization admins manage team build plans"\)/s,
    "Team-build plan readiness must retain the organization/season/division seam used for no-cross-org and replay-safe publish proof."
  );
}

function verifyAdminScope(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "admin-scope",
    "ADMIN_EXPORT_SESSION_ACTOR_MISSING",
    ["adminExportRoute", "liveActionsTest"],
    /requireAuthenticatedRouteUser\s*\([\s\S]*createAdminExport\s*\(\{[\s\S]*actorUserId:\s*auth\.user\.id[\s\S]*uses the authenticated admin session for reporting exports/s,
    "Admin exports must derive the actor from the verified route session."
  );
  requirePattern(
    blockers,
    sources,
    "admin-scope",
    "ADMIN_EXPORT_ORG_SCOPE_MISSING",
    ["reporting"],
    /\.from\("organization_memberships"\)[\s\S]*\.eq\("organization_id",\s*input\.organizationId\)[\s\S]*\.eq\("user_id",\s*input\.actorUserId\)[\s\S]*Only active organization admins can export league reports[\s\S]*\.from\("teams"\)[\s\S]*\.eq\("organization_id",\s*input\.organizationId\)[\s\S]*\.from\("players"\)[\s\S]*\.eq\("organization_id",\s*input\.organizationId\)[\s\S]*\.from\("events"\)[\s\S]*\.eq\("organization_id",\s*input\.organizationId\)/s,
    "Admin reporting must require active selected-organization admin authority and base reads on that organization."
  );
  requirePattern(
    blockers,
    sources,
    "admin-scope",
    "ADMIN_EXPORT_RELATED_ROWS_SCOPE_MISSING",
    ["reporting", "reportingTest"],
    /\.from\("player_guardians"\)[\s\S]*\.in\("player_id",\s*Array\.from\(playerIds\)\)[\s\S]*\.from\("profiles"\)[\s\S]*\.in\("id",\s*Array\.from\(profileIds\)\)[\s\S]*not\.toContain\("Other Tenant Parent"\)[\s\S]*not\.toContain\("other@example\.com"\)/s,
    "Admin exports must scope related guardian/profile rows to selected-organization player IDs and tests must exclude unrelated tenants."
  );
  requirePattern(
    blockers,
    sources,
    "admin-scope",
    "ADMIN_EXPORT_AUDIT_MISSING",
    ["reporting"],
    /audit_events[\s\S]*organization_id:\s*input\.organizationId[\s\S]*actor_user_id:\s*input\.actorUserId[\s\S]*action:\s*"admin_export_created"/s,
    "Admin exports must record selected-organization audit evidence."
  );
}

function verifyPublicIntakeAbuseControls(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "public-intake-abuse-controls",
    "PUBLIC_INTAKE_SHARED_LIMITER_MISSING",
    ["publicIntakeLimiter", "publicIntakeMigration", "registrationRoute", "mobileUsageRoute"],
    /export const PUBLIC_RATE_LIMITS[\s\S]*registrationRequests:[\s\S]*routeKey:\s*"registration-requests"[\s\S]*mobileUsageEvents:[\s\S]*routeKey:\s*"mobile-usage-events"[\s\S]*windowMs:\s*60_000[\s\S]*\.rpc\("claim_public_rate_limit"[\s\S]*create or replace function public\.claim_public_rate_limit[\s\S]*revoke all on function public\.claim_public_rate_limit[\s\S]*to service_role[\s\S]*applyPublicRateLimit\(request,\s*PUBLIC_RATE_LIMITS\.registrationRequests\)[\s\S]*applyPublicRateLimit\(request,\s*PUBLIC_RATE_LIMITS\.mobileUsageEvents\)/s,
    "Registration and mobile telemetry routes must use the service-only durable public-intake limiter."
  );
  requirePattern(
    blockers,
    sources,
    "public-intake-abuse-controls",
    "PUBLIC_INTAKE_HEADERS_MISSING",
    ["publicIntakeLimiter"],
    /"X-RateLimit-Limit"[\s\S]*"X-RateLimit-Remaining"[\s\S]*"X-RateLimit-Reset"[\s\S]*headers\.set\("Retry-After"/s,
    "The shared limiter must emit X-RateLimit-* headers and Retry-After when throttled."
  );
  requirePattern(
    blockers,
    sources,
    "public-intake-abuse-controls",
    "PUBLIC_INTAKE_429_TEST_MISSING",
    ["publicIntakeRateLimitTest"],
    /throttles registration bursts per client IP[\s\S]*response\.status\)\.toBe\(429\)[\s\S]*X-RateLimit-Limit[\s\S]*X-RateLimit-Remaining[\s\S]*Retry-After[\s\S]*throttles anonymous mobile telemetry bursts per client IP[\s\S]*response\.status\)\.toBe\(429\)[\s\S]*X-RateLimit-Limit[\s\S]*X-RateLimit-Remaining[\s\S]*Retry-After/s,
    "Focused tests must prove 429, Retry-After, and X-RateLimit-* headers for registration and mobile telemetry bursts."
  );
  requirePattern(
    blockers,
    sources,
    "public-intake-abuse-controls",
    "PUBLIC_INTAKE_ROUTE_429_MISSING",
    ["registrationRoute", "mobileUsageRoute"],
    /status:\s*429,\s*headers:\s*rateLimit\.headers[\s\S]*status:\s*429,\s*headers:\s*rateLimit\.headers/s,
    "Public intake routes must return 429 with shared rate-limit headers when blocked."
  );
}

export function verifyAdminProofClosureReadiness(sources) {
  const blockers = [];

  verifyMediaReport(sources, blockers);
  verifyMediaModeration(sources, blockers);
  verifyTeamBuilderPublish(sources, blockers);
  verifyAdminScope(sources, blockers);
  verifyPublicIntakeAbuseControls(sources, blockers);

  return {
    ok: blockers.length === 0,
    blockers,
    families: [
      "media-report",
      "media-moderation",
      "team-builder-publish",
      "admin-scope",
      "public-intake-abuse-controls"
    ],
    proofBoundary: "local repository-source contract only",
    openGates: [
      "hosted signed-in browser proof",
      "Supabase readback proof",
      "deployed edge or shared-store rate-limit proof"
    ]
  };
}

export function formatAdminProofClosureReadinessReport(result) {
  const lines = [];
  if (!result.ok) {
    lines.push("Admin proof closure readiness blocked.");
    lines.push("");
    lines.push("Blockers:");
    for (const blocker of result.blockers) {
      lines.push(`- ${blocker.code} [${blocker.family}]: ${blocker.message}`);
      lines.push(`  Paths: ${blocker.paths.join(", ")}`);
    }
  } else {
    lines.push("Admin proof closure readiness passed.");
    lines.push("");
    lines.push(`Verified families: ${result.families.join(", ")}.`);
  }

  lines.push("");
  lines.push(`Proof boundary: ${result.proofBoundary}.`);
  lines.push("This verifier reads repository files only. It does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, send providers, deploy, configure edge firewalls, or claim hosted acceptance.");
  lines.push("Still open before closure:");
  for (const gate of result.openGates) lines.push(`- ${gate}`);
  return lines.join("\n");
}

export function runAdminProofClosureReadinessCli(rootDir = process.cwd(), streams = { stdout: process.stdout, stderr: process.stderr }) {
  const result = verifyAdminProofClosureReadiness(readRepositorySources(rootDir));
  const report = formatAdminProofClosureReadinessReport(result);
  if (result.ok) {
    streams.stdout.write(`${report}\n`);
    return 0;
  }
  streams.stderr.write(`${report}\n`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runAdminProofClosureReadinessCli();
}
