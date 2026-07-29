#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_SOURCE_FILES = {
  parentSurfaces: "app/parent/_surfaces.tsx",
  parentReplayEngagementRoute: "app/api/parent/replays/[replayId]/engagement/route.ts",
  familyReplayService: "lib/supabase/family-replays.ts",
  familyReplayMigration: "supabase/migrations/0031_parent_replay_family_story.sql",
  familyReplayUi: "components/family-parent-replay.tsx",
  familyReplayUiTest: "components/family-parent-replay.test.tsx",
  familyReplayServiceTest: "lib/supabase/family-replays.test.ts",
  parentReplayOperations: "lib/supabase/operations.ts",
  routeScopes: "lib/supabase/route-scopes.ts",

  adminSurfaces: "app/admin/_surfaces.tsx",
  adminSeasonTransitionRoute: "app/api/admin/season-transitions/route.ts",
  parentSeasonTransitionRoute: "app/api/parent/season-transitions/[transitionId]/respond/route.ts",
  seasonTransitionService: "lib/supabase/season-transitions.ts",
  seasonTransitionMigration: "supabase/migrations/0032_season_transition_reviews.sql",
  seasonTransitionUi: "components/season-transition-review.tsx",
  seasonTransitionUiTest: "components/season-transition-review.test.tsx",
  seasonTransitionServiceTest: "lib/supabase/season-transitions.test.ts",
  seasonTransitionRouteTest: "app/api-season-transitions.test.ts"
};

const OPEN_GATES = [
  "hosted browser proof",
  "Supabase readback",
  "populated media consent/revocation proof",
  "multi-guardian transition concurrency proof",
  "storage/scanner proof",
  "provider sandbox proof",
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

function verifyParentReplayReadAuthority(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "parent-replay-read-authority",
    "PARENT_REPLAY_PAGE_SESSION_SCOPE_MISSING",
    ["parentSurfaces"],
    /requireParentPageAccess\(\)[\s\S]*listFamilyReplays\(\{\s*parentUserId:\s*pageAccess\.access\.userId\s*\}\)/s,
    "Parent Replay pages must derive family reads from the signed-in parent page access context."
  );
  requirePattern(
    blockers,
    sources,
    "parent-replay-read-authority",
    "PARENT_REPLAY_ACTIVE_GUARDIAN_SCOPE_MISSING",
    ["familyReplayService"],
    /\.from\("player_guardians"\)[\s\S]*\.select\("player_id"\)[\s\S]*\.eq\("parent_user_id",\s*input\.parentUserId\)[\s\S]*\.eq\("status",\s*"active"\)/s,
    "Family Replay reads must require active guardian links for the signed-in parent."
  );
  requirePattern(
    blockers,
    sources,
    "parent-replay-read-authority",
    "PARENT_REPLAY_CURRENT_CHILD_TEAM_SCOPE_MISSING",
    ["familyReplayService"],
    /\.from\("players"\)[\s\S]*\.select\("id,team_id,first_name,last_initial"\)[\s\S]*\.in\("id",\s*playerIds\)[\s\S]*const teamIds = \[\.\.\.new Set\(players\.map\(\(player\) => player\.team_id\)\)\]/s,
    "Family Replay reads must resolve current linked children and team scope before reading stories."
  );
  requirePattern(
    blockers,
    sources,
    "parent-replay-read-authority",
    "PARENT_REPLAY_PUBLISHED_QUEUE_FILTER_MISSING",
    ["familyReplayService", "routeScopes", "parentReplayOperations"],
    /\.from\("parent_replays"\)[\s\S]*\.eq\("status",\s*"queued"\)[\s\S]*\.not\("published_at",\s*"is",\s*null\)[\s\S]*options\.audience !== "parent" \|\| replay\.status === "queued"[\s\S]*Human approval is required before Parent Replay can be published/s,
    "Family reads must see only approved-and-published queued Replays; drafts and private coach/admin records must stay excluded."
  );
  requirePattern(
    blockers,
    sources,
    "parent-replay-read-authority",
    "PARENT_REPLAY_CHILD_LABEL_PRIVACY_MISSING",
    ["familyReplayService", "familyReplayUiTest"],
    /\$\{player\.first_name\} \$\{player\.last_initial\}\.[\s\S]*expect\(html\)\.toContain\("Mason T\."\)[\s\S]*expect\(html\)\.not\.toContain\("Mason"\)/s,
    "Child labels must remain first name plus last initial, and empty states must not leak seeded/private family identities."
  );
  requireNoPattern(
    blockers,
    sources,
    "parent-replay-read-authority",
    "PARENT_REPLAY_PRIVATE_DRAFT_READ_LEAK",
    ["familyReplayService"],
    /\.eq\("status",\s*"draft"\)|\.neq\("status",\s*"queued"\)/s,
    "Family Replay read service must not include draft/private coach records or coach/admin-only scope in parent reads."
  );
}

function verifyReplayMediaConsentAndRevocation(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "replay-media-consent-revocation",
    "REPLAY_MEDIA_SUBJECT_IDENTITY_MISSING",
    ["familyReplayMigration", "familyReplayServiceTest"],
    /Identify every child visible in this media[\s\S]*Each identified child may appear only once[\s\S]*Every identified child must belong to this Replay team[\s\S]*requires complete child subject identity/s,
    "Replay media publication must identify every subject child and bind subjects to the Replay team."
  );
  requirePattern(
    blockers,
    sources,
    "replay-media-consent-revocation",
    "REPLAY_MEDIA_GUARDIAN_CONSENT_MISSING",
    ["familyReplayMigration", "familyReplayService"],
    /Every identified child needs a current guardian[\s\S]*Current family media consent is required for every identified child[\s\S]*everyGuardianConsented[\s\S]*!consent\.revoked_at/s,
    "Replay media publication and reads must require every current guardian consent and honor revocation."
  );
  requirePattern(
    blockers,
    sources,
    "replay-media-consent-revocation",
    "REPLAY_MEDIA_MODERATION_SCAN_RELEASE_MISSING",
    ["familyReplayMigration", "familyReplayService", "familyReplayUi"],
    /(?=[\s\S]*moderation_status <> 'approved')(?=[\s\S]*family_release_approved_at is null)(?=[\s\S]*scan_completed_at is null)(?=[\s\S]*Accessible media description is required)(?=[\s\S]*altText)(?=[\s\S]*Read transcript)/s,
    "Replay media must require approved moderation, scan/family-release evidence for private media, and accessible alt/transcript copy."
  );
  requirePattern(
    blockers,
    sources,
    "replay-media-consent-revocation",
    "REPLAY_MEDIA_READ_TIME_SUPPRESSION_MISSING",
    ["familyReplayService", "familyReplayMigration"],
    /\.is\("revoked_at",\s*null\)[\s\S]*media\.storage_deleted_at[\s\S]*\(media\.private_object_path && !media\.scan_completed_at\)[\s\S]*revoke_parent_replay_family_media[\s\S]*parent_replay_family_media_revoked/s,
    "Read-time media projection must suppress revoked, deleted, unscanned, or consent-weakened media and keep revocation audited."
  );
}

function verifyPrivateEngagement(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "private-replay-engagement",
    "REPLAY_ENGAGEMENT_ROUTE_SESSION_ACTOR_MISSING",
    ["parentReplayEngagementRoute", "familyReplayUi"],
    /(?=[\s\S]*requireAuthenticatedRouteUser\(request\))(?=[\s\S]*parentUserId:\s*auth\.user\.id)(?=[\s\S]*new Set\(\["viewed",\s*"activity_completed",\s*"saved"\]\))(?=[\s\S]*operation: operation)/s,
    "Replay engagement routes must derive the parent from the verified session and keep the viewed/activity_completed/saved operation set."
  );
  requirePattern(
    blockers,
    sources,
    "private-replay-engagement",
    "REPLAY_ENGAGEMENT_PARENT_SCOPE_MISSING",
    ["familyReplayMigration", "familyReplayService"],
    /parents read own replay engagement[\s\S]*parent_user_id = auth\.uid\(\)[\s\S]*target_parent_user_id[\s\S]*guardian\.parent_user_id = target_parent_user_id[\s\S]*player\.team_id = replay_row\.team_id/s,
    "Replay engagement rows must be parent-scoped and available only to a linked family for the Replay team."
  );
  requirePattern(
    blockers,
    sources,
    "private-replay-engagement",
    "REPLAY_ENGAGEMENT_PROVIDER_FREE_NO_RANKING_MISSING",
    ["familyReplayMigration", "familyReplayUi", "familyReplayServiceTest"],
    /This does not rank the child or family[\s\S]*does not score, rank, or evaluate your child[\s\S]*sendEmail[\s\S]*sendSms/s,
    "Replay engagement must remain private, provider-free, and never become a child/family ranking signal."
  );
  requireNoPattern(
    blockers,
    sources,
    "private-replay-engagement",
    "REPLAY_ENGAGEMENT_RANKING_IMPLEMENTATION_PRESENT",
    ["familyReplayService", "parentReplayEngagementRoute"],
    /\brank(?:ing|ed)?\b|\bleaderboard\b|\bscore\b/i,
    "Replay engagement implementation must not compute or expose ranking, leaderboard, or score behavior."
  );
}

function verifySeasonTransitionAuthority(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "season-transition-authority",
    "SEASON_TRANSITION_ROUTE_SESSION_ACTORS_MISSING",
    ["adminSeasonTransitionRoute", "parentSeasonTransitionRoute", "seasonTransitionRouteTest"],
    /requireAuthenticatedRouteUser\(request\)[\s\S]*actorUserId:\s*auth\.user\.id[\s\S]*expectedLockVersion[\s\S]*derives the proposing administrator from the verified session[\s\S]*derives the responding guardian from the verified session/s,
    "Season transition routes must derive both administrator and guardian actors from verified sessions and pass lock versions."
  );
  requirePattern(
    blockers,
    sources,
    "season-transition-authority",
    "SEASON_TRANSITION_ADMIN_PROPOSAL_AUTHORITY_MISSING",
    ["seasonTransitionMigration", "adminSurfaces"],
    /membership\.role = 'admin'[\s\S]*Only a league administrator can propose a season change[\s\S]*listAdminSeasonTransitions\(pageAccess\.access\.adminOrganizationIds\)/s,
    "Season transition proposals must require organization-admin authority and admin-scoped reads."
  );
  requirePattern(
    blockers,
    sources,
    "season-transition-authority",
    "SEASON_TRANSITION_EVERY_GUARDIAN_LOCK_EXPIRATION_MISSING",
    ["seasonTransitionMigration", "seasonTransitionService", "seasonTransitionUi"],
    /At least one current signed-in guardian must review this change[\s\S]*Every current guardian must accept the current review before application[\s\S]*lock_version <> expected_lock_version[\s\S]*expires_at <= now\(\)[\s\S]*Review expires/s,
    "Season transitions must require current guardian review, lock-version concurrency, and expiration state."
  );
  requirePattern(
    blockers,
    sources,
    "season-transition-authority",
    "SEASON_TRANSITION_FIXED_SCOPE_AND_AUDIT_MISSING",
    ["seasonTransitionMigration", "seasonTransitionUi"],
    /(?=[\s\S]*array\['child_display_identity', 'guardian_relationship'\])(?=[\s\S]*'media_consent', 'notification_preferences', 'team_conversation')(?=[\s\S]*insert into public\.audit_events)(?=[\s\S]*No roster change or provider message occurs)/s,
    "Season transition carry-forward/reset fields must be fixed, audited, and provider-free rather than caller-selected."
  );
  requireNoPattern(
    blockers,
    sources,
    "season-transition-authority",
    "SEASON_TRANSITION_CALLER_SELECTED_SCOPE_PRESENT",
    ["seasonTransitionMigration"],
    /target_carry_forward_fields|target_reset_required_fields/s,
    "Season transition RPCs must not accept caller-selected carry-forward or reset field lists."
  );
}

function verifyApplyRevertDownstreamRefusal(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "apply-revert-downstream-refusal",
    "SEASON_APPLY_SOURCE_ARCHIVE_TARGET_PROVENANCE_MISSING",
    ["seasonTransitionMigration", "seasonTransitionServiceTest"],
    /insert into public\.players[\s\S]*source_player\.first_name, source_player\.last_initial, null, transition_row\.id[\s\S]*insert into public\.player_guardians[\s\S]*source_season_transition_review_id[\s\S]*set roster_status = 'archived'[\s\S]*creates a provenance-linked child record/s,
    "Applying a reviewed transition must archive only the source roster and create provenance-linked target player and guardian truth."
  );
  requirePattern(
    blockers,
    sources,
    "apply-revert-downstream-refusal",
    "SEASON_DOWNSTREAM_REFUSAL_MISSING",
    ["seasonTransitionMigration", "seasonTransitionServiceTest"],
    /parent_invites[\s\S]*rsvps[\s\S]*player_media_consents[\s\S]*temporary_caregiver_authorizations[\s\S]*parent_replay_family_media[\s\S]*needs a new reviewed correction instead of deletion[\s\S]*permits deletion only before all known downstream family activity/s,
    "Applied transitions must refuse deletion/revert after downstream family activity exists."
  );
  requirePattern(
    blockers,
    sources,
    "apply-revert-downstream-refusal",
    "SEASON_REVERT_SERVICE_ONLY_AUDIT_MISSING",
    ["seasonTransitionMigration", "seasonTransitionUi", "seasonTransitionService"],
    /(?=[\s\S]*revoke all on function public\.revert_season_transition)(?=[\s\S]*to service_role)(?=[\s\S]*season_transition_reverted)(?=[\s\S]*correction_reason)(?=[\s\S]*Correct before activity)/s,
    "Revert/correction must remain service-only with correction reason, UI guardrails, and audit history."
  );
}

export function verifyFamilySeasonContinuityReadiness(sources) {
  const blockers = [];
  const allKeys = Object.keys(DEFAULT_SOURCE_FILES);
  for (const key of allKeys) {
    if (typeof sources[key] !== "string") {
      addBlocker(blockers, "source", "SOURCE_FILE_MISSING", [key], "Required source file was not supplied to the verifier.");
    }
  }

  verifyParentReplayReadAuthority(sources, blockers);
  verifyReplayMediaConsentAndRevocation(sources, blockers);
  verifyPrivateEngagement(sources, blockers);
  verifySeasonTransitionAuthority(sources, blockers);
  verifyApplyRevertDownstreamRefusal(sources, blockers);

  return {
    ok: blockers.length === 0,
    checkedFiles: allKeys.map((key) => DEFAULT_SOURCE_FILES[key]),
    blockers,
    families: [
      "parent-replay-read-authority",
      "replay-media-consent-revocation",
      "private-replay-engagement",
      "season-transition-authority",
      "apply-revert-downstream-refusal"
    ],
    proofBoundary: "local repository-source readiness proof only",
    openGates: OPEN_GATES
  };
}

export function formatFamilySeasonContinuityReadinessReport(result) {
  const lines = [];
  if (result.ok) {
    lines.push("Family season continuity readiness verifier passed.");
    lines.push(`Checked ${result.checkedFiles.length} repository files without hosted credentials, network access, Supabase calls, browser automation, provider sends, seed writes, storage uploads, deploys, or mutations.`);
    lines.push(`Verified families: ${result.families.join(", ")}.`);
  } else {
    lines.push("Family season continuity readiness verifier failed.");
    lines.push("");
    lines.push("Blockers:");
    for (const blocker of result.blockers) {
      lines.push(`- [${blocker.code}] ${blocker.family}: ${blocker.message}`);
      lines.push(`  Paths: ${blocker.paths.join(", ")}`);
    }
  }

  lines.push("");
  lines.push(`Proof boundary: ${result.proofBoundary}.`);
  lines.push("This verifier reads repository files only. It does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, create provider sends, upload media, create storage objects, deploy, configure storage/scanner/realtime/provider infrastructure, or claim hosted acceptance.");
  lines.push("Still open before LPM-006 closure:");
  for (const gate of result.openGates) lines.push(`- ${gate}`);
  return lines.join("\n");
}

export function runFamilySeasonContinuityReadinessCli(
  rootDir = process.cwd(),
  streams = { stdout: process.stdout, stderr: process.stderr }
) {
  const result = verifyFamilySeasonContinuityReadiness(readRepositorySources(rootDir));
  const report = formatFamilySeasonContinuityReadinessReport(result);
  if (result.ok) {
    streams.stdout.write(`${report}\n`);
    return 0;
  }
  streams.stderr.write(`${report}\n`);
  return 1;
}

function main() {
  process.exitCode = runFamilySeasonContinuityReadinessCli();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
