#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_SOURCE_FILES = {
  gameDayRoute: "app/api/game-day-resolution/route.ts",
  gameDayService: "lib/supabase/game-day-resolution.ts",
  gameDayMigration: "supabase/migrations/0024_coordination_loops.sql",
  gameDayServiceTest: "lib/supabase/game-day-resolution.test.ts",

  officialRoute: "app/api/official-communications/publish/route.ts",
  officialService: "lib/supabase/official-communications.ts",
  officialMigration: "supabase/migrations/0030_official_communication_revisions.sql",
  officialRouteTest: "app/api-official-communications.test.ts",
  officialServiceTest: "lib/supabase/official-communications.test.ts",

  notificationReceipts: "lib/supabase/notification-receipts.ts",
  communicationRoom: "components/communication-room.tsx",
  communicationRoomTest: "components/communication-room.test.tsx",

  operationalTruth: "lib/operational-truth.ts",
  offlineOutbox: "lib/offline/game-day-outbox.ts",
  offlineOutboxTest: "lib/offline/game-day-outbox.test.ts"
};

const OPEN_GATES = [
  "hosted browser proof",
  "Supabase readback",
  "populated one-version family projection",
  "provider sandbox/webhook proof",
  "realtime/offline production behavior",
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

function verifyGameDayDecisionAuthority(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "game-day-decision-authority",
    "GAME_DAY_ROUTE_SESSION_ACTOR_MISSING",
    ["gameDayRoute"],
    /requireAuthenticatedRouteUser\s*\([\s\S]*actorUserId:\s*auth\.user\.id/s,
    "The game-day POST route must derive the actor from the verified route session."
  );
  requirePattern(
    blockers,
    sources,
    "game-day-decision-authority",
    "GAME_DAY_ROUTE_DECISION_SET_MISSING",
    ["gameDayRoute", "gameDayService"],
    /new\s+Set\(\["monitor",\s*"confirm_on_time",\s*"delay",\s*"cancel"\]\)[\s\S]*export\s+type\s+GameDayDecision\s*=\s*"monitor"\s*\|\s*"confirm_on_time"\s*\|\s*"delay"\s*\|\s*"cancel"/s,
    "The game-day route and service must keep the bounded monitor, confirm, delay, and cancel decision set."
  );
  requirePattern(
    blockers,
    sources,
    "game-day-decision-authority",
    "GAME_DAY_IDEMPOTENCY_FORWARDING_MISSING",
    ["gameDayRoute", "gameDayService", "gameDayMigration"],
    /Idempotency-Key[\s\S]*idempotencyKey:[\s\S]*p_idempotency_key[\s\S]*idempotency_key text not null unique/s,
    "The game-day route, service, and RPC must forward and persist a durable idempotency key."
  );
  requirePattern(
    blockers,
    sources,
    "game-day-decision-authority",
    "GAME_DAY_COACH_ADMIN_AUTHORITY_MISSING",
    ["gameDayService", "gameDayMigration"],
    /requireActiveTeamCoachOrOrgAdmin[\s\S]*action:\s*"resolve game-day events"[\s\S]*membership\.role = 'coach'[\s\S]*membership\.role = 'admin'[\s\S]*Only assigned coaches or organization admins can resolve a game-day event/s,
    "The Supabase service/RPC must require assigned coach or organization-admin authority before recording a review."
  );
  requirePattern(
    blockers,
    sources,
    "game-day-decision-authority",
    "GAME_DAY_VALIDATION_TEST_MISSING",
    ["gameDayServiceTest"],
    /future start time[\s\S]*monitor decisions[\s\S]*human-review receipt/s,
    "Focused tests must cover delay timing and monitor decision review receipt behavior."
  );
}

function verifyScheduleVersionAndAuditEvidence(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "schedule-version-audit-evidence",
    "GAME_DAY_VERSIONED_EVENT_EVIDENCE_MISSING",
    ["gameDayMigration"],
    /original_event_json jsonb not null[\s\S]*applied_event_json jsonb not null[\s\S]*schedule_version = coalesce\(schedule_version, 0\) \+ 1[\s\S]*event_change_logs/s,
    "Game-day decisions must persist original/applied event evidence and record schedule-version-changing event change logs."
  );
  requirePattern(
    blockers,
    sources,
    "schedule-version-audit-evidence",
    "GAME_DAY_REVIEW_AUDIT_MISSING",
    ["gameDayMigration", "gameDayService"],
    /game_day_resolution_reviews[\s\S]*evidence_json[\s\S]*affected_recipient_count[\s\S]*notification_count[\s\S]*audit_events[\s\S]*game_day_resolution_reviewed/s,
    "Game-day decisions must create durable review evidence, recipient counts, notification counts, and audit events."
  );
  requirePattern(
    blockers,
    sources,
    "schedule-version-audit-evidence",
    "GAME_DAY_PENDING_ONLY_RECIPIENTS_MISSING",
    ["gameDayMigration"],
    /insert into public\.notifications[\s\S]*channel,[\s\S]*status[\s\S]*'email',[\s\S]*'pending'[\s\S]*zero provider sends/s,
    "Game-day decisions must create pending in-app/provider-review records only, with zero provider sends."
  );
  requirePattern(
    blockers,
    sources,
    "schedule-version-audit-evidence",
    "OFFICIAL_EVENT_VERSION_BINDING_MISSING",
    ["officialMigration", "officialService"],
    /event_schedule_version integer not null[\s\S]*coalesce\(event_row\.schedule_version, 1\) <> expected_schedule_version[\s\S]*expectedScheduleVersion:\s*number/s,
    "Official-message publication must bind work to the current event schedule version."
  );
}

function verifyOfficialCommunicationRevisionAuthority(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "official-communication-revision-authority",
    "OFFICIAL_ROUTE_SESSION_ACTOR_MISSING",
    ["officialRoute", "officialRouteTest"],
    /requireAuthenticatedRouteUser\s*\([\s\S]*actorUserId:\s*auth\.user\.id[\s\S]*derives the publisher from the verified session/s,
    "Official communication publish/correction/withdrawal must derive the actor from the verified session."
  );
  requirePattern(
    blockers,
    sources,
    "official-communication-revision-authority",
    "OFFICIAL_ACTION_SET_MISSING",
    ["officialRoute", "officialService", "officialMigration"],
    /new\s+Set<OfficialCommunicationAction>\(\["published",\s*"corrected",\s*"withdrawn"\]\)[\s\S]*target_action not in \('published', 'corrected', 'withdrawn'\)/s,
    "Official communications must keep bounded publish, correction, and withdrawal actions."
  );
  requirePattern(
    blockers,
    sources,
    "official-communication-revision-authority",
    "OFFICIAL_EXPECTED_VERSION_KEYS_MISSING",
    ["officialRoute", "officialService", "officialMigration"],
    /expectedThreadVersion:\s*Number[\s\S]*expectedScheduleVersion:\s*Number[\s\S]*idempotencyKey:[\s\S]*expected_thread_version integer[\s\S]*expected_schedule_version integer[\s\S]*action_idempotency_key text/s,
    "Official communication routes/RPCs must pass expected thread version, expected schedule version, and idempotency key."
  );
  requirePattern(
    blockers,
    sources,
    "official-communication-revision-authority",
    "OFFICIAL_IMMUTABLE_VERSION_ROWS_MISSING",
    ["officialMigration"],
    /unique \(thread_id, version_number\)[\s\S]*prevent_official_communication_version_mutation[\s\S]*Create a correction or withdrawal instead[\s\S]*official_communication_versions_immutable/s,
    "Official communication versions must be immutable additive rows."
  );
  requirePattern(
    blockers,
    sources,
    "official-communication-revision-authority",
    "OFFICIAL_SUPERSEDED_SUPPRESSION_MISSING",
    ["officialMigration", "notificationReceipts", "officialServiceTest"],
    /thread_row\.current_version_id is distinct from version_row\.id[\s\S]*return \[\][\s\S]*if \(thread\.current_version_id !== linkedVersion\.id\) return \[\][\s\S]*superseded/s,
    "Superseded official recipient/projection records must be suppressed from family acknowledgment/readback."
  );
  requirePattern(
    blockers,
    sources,
    "official-communication-revision-authority",
    "OFFICIAL_PENDING_ONLY_RECIPIENTS_MISSING",
    ["officialMigration", "officialService", "officialServiceTest"],
    /'provider_delivery', false, 'pending'[\s\S]*'pending', 'pending', version_row\.id[\s\S]*'provider_execution', 'not_started'[\s\S]*external delivery has not started/s,
    "Official communications must create pending in-app recipient records only and report provider execution as not started."
  );
  requireNoPattern(
    blockers,
    sources,
    "official-communication-revision-authority",
    "OFFICIAL_PROVIDER_EXECUTOR_PRESENT",
    ["officialService", "officialMigration"],
    /@sendgrid\/mail|\btwilio\b|\bweb-push\b|\bsendMail\s*\(|\bmessages\.create\s*\(/i,
    "The local readiness contract must stay provider-free; provider sends belong to a separate approved proof slice."
  );
}

function verifyFamilyCurrentVersionReadback(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "family-current-version-readback",
    "RECEIPT_OFFICIAL_REVISION_SHAPE_MISSING",
    ["notificationReceipts"],
    /export interface OfficialCommunicationRevision[\s\S]*versionNumber[\s\S]*eventScheduleVersion[\s\S]*requiredProjectionCount[\s\S]*readyProjectionCount[\s\S]*partialPropagation[\s\S]*history/s,
    "Receipt projection code must expose official revision truth, current version, schedule version, projection counts, partial propagation, and history."
  );
  requirePattern(
    blockers,
    sources,
    "family-current-version-readback",
    "RECEIPT_CURRENT_VERSION_FILTER_MISSING",
    ["notificationReceipts"],
    /current_version_id[\s\S]*if \(thread\.current_version_id !== linkedVersion\.id\) return \[\][\s\S]*partialPropagation: requiredProjections\.some/s,
    "Family receipt projection must return only the current official version and compute partial propagation."
  );
  requirePattern(
    blockers,
    sources,
    "family-current-version-readback",
    "COMMUNICATION_ROOM_REVISION_UI_MISSING",
    ["communicationRoom", "communicationRoomTest"],
    /function RevisionTruth[\s\S]*Corrected · current version[\s\S]*Event schedule version[\s\S]*See correction history[\s\S]*has not reached every required family surface/s,
    "Communication Room must render current version number, schedule version, correction history, and partial propagation warnings."
  );
  requirePattern(
    blockers,
    sources,
    "family-current-version-readback",
    "COMMUNICATION_ROOM_PROJECTION_COUNTS_MISSING",
    ["communicationRoom"],
    /Same official event version ready on \{revision\.readyProjectionCount\} of \{revision\.requiredProjectionCount\} required surfaces/s,
    "Communication Room must render required ready projection counts for current official versions."
  );
  requirePattern(
    blockers,
    sources,
    "family-current-version-readback",
    "ACK_NOT_PROVIDER_DELIVERY_COPY_MISSING",
    ["communicationRoom", "officialMigration"],
    /It proves you reviewed this message version[\s\S]*does not prove attendance, agreement, compliance, safety completion, or ride responsibility[\s\S]*Provider acceptance, delivery, read, and acknowledgment remain separate evidence/s,
    "Family readback must not treat provider delivery, read, or approval as acknowledgment."
  );
}

function verifyOfflineReconnectConflictBehavior(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "offline-reconnect-conflict-behavior",
    "OFFLINE_SYNC_ENVELOPE_VERSION_FIELDS_MISSING",
    ["operationalTruth", "offlineOutboxTest"],
    /export interface SyncEnvelope[\s\S]*actionId: string[\s\S]*baseRecordVersion\?: number[\s\S]*baseScheduleVersion\?: number[\s\S]*conflictDetail\?: string[\s\S]*baseScheduleVersion: 1/s,
    "Offline game-day actions must preserve action IDs, record versions, schedule versions, and conflict detail."
  );
  requirePattern(
    blockers,
    sources,
    "offline-reconnect-conflict-behavior",
    "OFFLINE_ALLOWED_ACTION_BOUNDARY_MISSING",
    ["offlineOutbox", "offlineOutboxTest"],
    /actionType === "rsvp"[\s\S]*actionType === "attendance"[\s\S]*actionType === "coach_note"[\s\S]*publish[\s\S]*toBe\(false\)/s,
    "Offline game-day outbox must stay limited to low-authority RSVP, attendance, and coach-note actions."
  );
  requirePattern(
    blockers,
    sources,
    "offline-reconnect-conflict-behavior",
    "OFFLINE_CONFLICT_409_MISSING",
    ["offlineOutbox"],
    /const conflict = result\.status === 409[\s\S]*conflictDetail:[\s\S]*Server version changed[\s\S]*if \(conflict\) break/s,
    "Reconnect sync must preserve explicit conflict/degraded state on 409 and stop before silently overwriting newer server truth."
  );
  requirePattern(
    blockers,
    sources,
    "offline-reconnect-conflict-behavior",
    "OFFLINE_DISPLAY_STATE_TEST_MISSING",
    ["offlineOutboxTest"],
    /Waiting to sync[\s\S]*Retry online[\s\S]*Sync conflict[\s\S]*Synced/s,
    "Focused tests must cover waiting, retry, conflict, and synced outbox states."
  );
}

export function verifyGameDayCommunicationReadiness(sources) {
  const blockers = [];
  const allKeys = Object.keys(DEFAULT_SOURCE_FILES);
  for (const key of allKeys) {
    if (typeof sources[key] !== "string") {
      addBlocker(blockers, "source", "SOURCE_FILE_MISSING", [key], "Required source file was not supplied to the verifier.");
    }
  }

  verifyGameDayDecisionAuthority(sources, blockers);
  verifyScheduleVersionAndAuditEvidence(sources, blockers);
  verifyOfficialCommunicationRevisionAuthority(sources, blockers);
  verifyFamilyCurrentVersionReadback(sources, blockers);
  verifyOfflineReconnectConflictBehavior(sources, blockers);

  return {
    ok: blockers.length === 0,
    checkedFiles: allKeys.map((key) => DEFAULT_SOURCE_FILES[key]),
    blockers,
    families: [
      "game-day-decision-authority",
      "schedule-version-audit-evidence",
      "official-communication-revision-authority",
      "family-current-version-readback",
      "offline-reconnect-conflict-behavior"
    ],
    proofBoundary: "local repository-source readiness proof only",
    openGates: OPEN_GATES
  };
}

export function formatGameDayCommunicationReadinessReport(result) {
  const lines = [];
  if (result.ok) {
    lines.push("Game-day communication readiness verifier passed.");
    lines.push(`Checked ${result.checkedFiles.length} repository files without hosted credentials, network access, Supabase calls, browser automation, provider sends, seed writes, deploys, or mutations.`);
    lines.push(`Verified families: ${result.families.join(", ")}.`);
  } else {
    lines.push("Game-day communication readiness verifier failed.");
    lines.push("");
    lines.push("Blockers:");
    for (const blocker of result.blockers) {
      lines.push(`- [${blocker.code}] ${blocker.family}: ${blocker.message}`);
      lines.push(`  Paths: ${blocker.paths.join(", ")}`);
    }
  }

  lines.push("");
  lines.push(`Proof boundary: ${result.proofBoundary}.`);
  lines.push("This verifier reads repository files only. It does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, create provider sends, deploy, configure realtime/provider infrastructure, or claim hosted acceptance.");
  lines.push("Still open before LPM-005 closure:");
  for (const gate of result.openGates) lines.push(`- ${gate}`);
  return lines.join("\n");
}

export function runGameDayCommunicationReadinessCli(
  rootDir = process.cwd(),
  streams = { stdout: process.stdout, stderr: process.stderr }
) {
  const result = verifyGameDayCommunicationReadiness(readRepositorySources(rootDir));
  const report = formatGameDayCommunicationReadinessReport(result);
  if (result.ok) {
    streams.stdout.write(`${report}\n`);
    return 0;
  }
  streams.stderr.write(`${report}\n`);
  return 1;
}

function main() {
  process.exitCode = runGameDayCommunicationReadinessCli();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
