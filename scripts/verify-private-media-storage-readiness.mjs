#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_SOURCE_FILES = {
  initiateRoute: "app/api/media/uploads/initiate/route.ts",
  completeRoute: "app/api/media/uploads/complete/route.ts",
  familyReleaseRoute: "app/api/media/family-release/route.ts",
  moderationRoute: "app/api/media/moderation/route.ts",
  reportRoute: "app/api/media/report/route.ts",

  privateMediaService: "lib/supabase/private-media.ts",
  featureGates: "lib/services/feature-gates.ts",
  operations: "lib/supabase/operations.ts",
  familyReplayService: "lib/supabase/family-replays.ts",
  teamPortalAdapter: "lib/supabase/team-portal.ts",
  dashboardAdapter: "lib/supabase/dashboard-data.ts",

  operationalTruthMigration: "supabase/migrations/0023_operational_truth_hardening.sql",
  familyReplayMigration: "supabase/migrations/0031_parent_replay_family_story.sql",

  apiAuthTest: "app/api-auth.test.ts",
  familyReplayServiceTest: "lib/supabase/family-replays.test.ts",
  familyReplayUiTest: "components/family-parent-replay.test.tsx",

  privacyDocs: "docs/privacy-security.md",
  runbook: "docs/runbook.md",
  workPlan: "docs/missing-production-slices-work-plan.md",
  taskBoard: "docs/production-task-board.md"
};

const OPEN_GATES = [
  "storage-provider setup",
  "scanner-provider setup",
  "hosted signed-upload proof",
  "hosted scan proof",
  "populated consent/revocation proof",
  "deletion/retention proof",
  "abuse/takedown proof",
  "accessibility proof",
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
  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  const ok = patterns.every((item) => typeof item === "string" ? text.includes(item) : item.test(text));
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

function verifyUploadGatesAndAuthority(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "upload-gates-authority",
    "UPLOAD_ROUTES_SESSION_ACTOR_MISSING",
    ["initiateRoute", "completeRoute", "familyReleaseRoute", "apiAuthTest"],
    [
      "requireAuthenticatedRouteUser(request)",
      "actorUserId: auth.user.id",
      "app/api/media/uploads/initiate/route.ts",
      "app/api/media/uploads/complete/route.ts",
      "app/api/media/family-release/route.ts"
    ],
    "Private media upload and family-release routes must derive actor authority from the authenticated route session."
  );
  requirePattern(
    blockers,
    sources,
    "upload-gates-authority",
    "UPLOAD_ROLE_AUTHORITY_MISSING",
    ["privateMediaService"],
    [
      "requireActiveTeamCoachOrOrgAdmin",
      'action: "initiate a private media upload"',
      'action: "complete a private media upload"',
      "requireActiveOrganizationAdmin",
      'action: "approve media for family release"'
    ],
    "Upload initiation/completion must require assigned-coach or org-admin authority, and family release must require organization-admin authority."
  );
  requirePattern(
    blockers,
    sources,
    "upload-gates-authority",
    "UPLOAD_GATE_MEDIA_FEATURE_FLAG_MISSING",
    ["privateMediaService", "featureGates", "operationalTruthMigration", "runbook"],
    [
      'media_uploads: "MEDIA_UPLOADS_ENABLED"',
      'feature: "media_uploads"',
      '.select("media_uploads_enabled")',
      "media_uploads_enabled boolean not null default false",
      "MEDIA_SCAN_ADAPTER_READY=true"
    ],
    "Private uploads must fail closed behind the server kill switch, organization flag, and scanner-readiness gate."
  );
  requirePattern(
    blockers,
    sources,
    "upload-gates-authority",
    "UPLOAD_STORAGE_TOKEN_AFTER_GATES_MISSING",
    ["privateMediaService"],
    /const gate = await loadMediaGate[\s\S]*if \(!gate\.enabled\)[\s\S]*const objectPath = `\$\{access\.team\.organization_id\}\/\$\{input\.teamId\}\/quarantine\/\$\{randomUUID\(\)\}\.\$\{extensionForMime\(input\.mimeType\)\}`[\s\S]*createSignedUploadUrl\(objectPath\)/,
    "Signed storage upload tokens must be created only after role, team, environment, organization, and scanner-readiness gates pass."
  );
  requireNoPattern(
    blockers,
    sources,
    "upload-gates-authority",
    "UPLOAD_ROUTE_CLIENT_ACTOR_OVERRIDE_PRESENT",
    ["initiateRoute", "completeRoute", "familyReleaseRoute"],
    /actorUserId:\s*String\(body\.|reviewerUserId:\s*String\(body\./s,
    "Private media routes must not accept caller-supplied actor or reviewer ids."
  );
}

function verifyTenantQuarantineStorage(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "tenant-quarantine-storage",
    "QUARANTINE_TENANT_PATH_MISSING",
    ["privateMediaService", "privacyDocs"],
    [
      'const MEDIA_BUCKET = "leaguepilot-private-media"',
      "${access.team.organization_id}/${input.teamId}/quarantine/${randomUUID()}.${extensionForMime(input.mimeType)}",
      "organization/team-scoped private quarantine paths"
    ],
    "Quarantine object paths must include organization id, team id, the quarantine prefix, a generated id, and the private media bucket."
  );
  requirePattern(
    blockers,
    sources,
    "tenant-quarantine-storage",
    "QUARANTINE_ALLOWED_IMAGE_EXTENSIONS_MISSING",
    ["privateMediaService"],
    [
      'allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"])',
      'if (mimeType === "image/png") return "png"',
      'if (mimeType === "image/webp") return "webp"',
      'return "jpg"'
    ],
    "Quarantined upload paths must use only allowed image MIME types and jpg/png/webp extensions."
  );
  requirePattern(
    blockers,
    sources,
    "tenant-quarantine-storage",
    "QUARANTINE_FAMILY_VISIBLE_BOUNDARY_MISSING",
    ["privateMediaService", "privacyDocs", "runbook", "taskBoard"],
    [
      "Private quarantine upload authorized. The asset is not family visible.",
      "Unscanned or failed-scan assets never leave quarantine",
      "quarantine/proof-only",
      "media is quarantined until scan/consent/release"
    ],
    "Route responses and docs must keep quarantine separate from family-visible media."
  );
}

function verifyScannerProcessingEvidence(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "scanner-processing-evidence",
    "SCANNER_SIZE_TYPE_HASH_INPUT_MISSING",
    ["privateMediaService", "privacyDocs"],
    [
      "MAX_UPLOAD_BYTES = 10 * 1024 * 1024",
      "/^[a-f0-9]{64}$/i.test(input.sha256)",
      "original.byteLength !== Number(media.data.content_size_bytes)",
      "originalHash !== media.data.content_sha256.toLowerCase()",
      "declared MIME/size/hash"
    ],
    "Scanner readiness must retain upload size, MIME type, declared SHA-256, actual byte length, and computed SHA-256 checks."
  );
  requirePattern(
    blockers,
    sources,
    "scanner-processing-evidence",
    "SCANNER_MAGIC_DECODE_EXIF_MISSING",
    ["privateMediaService", "privacyDocs"],
    [
      "hasSupportedMagicBytes(original)",
      "Buffer.from([0x89, 0x50, 0x4e, 0x47",
      'buffer.subarray(8, 12).toString("ascii") === "WEBP"',
      /\.rotate\(\)[\s\S]*\.jpeg\(\{ quality: 88, mozjpeg: true \}\)[\s\S]*\.toBuffer\(\)/,
      "remove EXIF and hidden metadata"
    ],
    "Scanner readiness must retain magic-byte validation, image decode, rotation/re-encode, and EXIF/metadata stripping evidence."
  );
  requirePattern(
    blockers,
    sources,
    "scanner-processing-evidence",
    "SCANNER_ENDPOINT_TOKEN_PROVIDER_MISSING",
    ["privateMediaService", "runbook"],
    [
      'MEDIA_SCAN_ADAPTER_READY === "true"',
      "env.MEDIA_SCAN_ENDPOINT",
      "env.MEDIA_SCAN_TOKEN",
      "env.MEDIA_SCAN_PROVIDER",
      "authorization: `Bearer ${env.MEDIA_SCAN_TOKEN}`",
      '"x-content-sha256": input.sha256',
      "Media scanner: `MEDIA_SCAN_ENDPOINT`, `MEDIA_SCAN_TOKEN`, and `MEDIA_SCAN_PROVIDER`"
    ],
    "Scanner calls must require adapter readiness plus endpoint, token, provider, and content-hash binding."
  );
  requirePattern(
    blockers,
    sources,
    "scanner-processing-evidence",
    "SCANNER_CLEAN_EVIDENCE_ID_MISSING",
    ["privateMediaService"],
    [
      "clean?: boolean",
      "evidenceId?: string",
      "if (!evidence?.clean || !evidence.evidenceId)",
      "Media remains quarantined because scan evidence did not mark it clean."
    ],
    "Scanner evidence must include a clean result and scan evidence id before any release path can continue."
  );
  requirePattern(
    blockers,
    sources,
    "scanner-processing-evidence",
    "SCANNER_PROCESSED_WRITE_QUARANTINE_REMOVAL_MISSING",
    ["privateMediaService"],
    [
      "`/processed/${media.data.id}.jpg`",
      /upload\(processedPath,\s*processed,[\s\S]*contentType:\s*"image\/jpeg"/,
      /remove\(\[media\.data\.private_object_path\]\)[\s\S]*scan_completed_at:\s*now/,
      "scan_evidence_json: scan.evidence",
      "retention_delete_after:"
    ],
    "Processed-path write, original quarantine removal, scan evidence, and retention deadline must precede a completed scan record."
  );
}

function verifyFamilyReleaseAndReadPrivacy(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "family-release-read-privacy",
    "FAMILY_RELEASE_ADMIN_SCAN_MODERATION_MISSING",
    ["privateMediaService", "familyReplayMigration", "operations"],
    [
      "requireActiveOrganizationAdmin",
      "if (!media.data.scan_completed_at)",
      "media_row.moderation_status <> 'approved'",
      "media_row.family_release_approved_at is null",
      "Uploaded media cannot be approved until verified scan and family-release evidence are complete."
    ],
    "Family release and moderation must require admin authority, scan evidence, family-release evidence, and approved moderation."
  );
  requirePattern(
    blockers,
    sources,
    "family-release-read-privacy",
    "FAMILY_RELEASE_CONSENT_MISSING",
    ["privateMediaService", "familyReplayMigration", "familyReplayServiceTest"],
    [
      '.from("player_media_consents")',
      '.eq("scope", "team_family")',
      '.not("granted_at", "is", null)',
      '.is("revoked_at", null)',
      "input.playerIds.some((playerId) => !consented.has(playerId))",
      "Current family media consent is required for every identified child",
      "requires complete child subject identity and every current guardian consent"
    ],
    "Family release must require complete subject identity and every active guardian's current team-family consent."
  );
  requirePattern(
    blockers,
    sources,
    "family-release-read-privacy",
    "FAMILY_RELEASE_ACCESSIBILITY_MISSING",
    ["familyReplayMigration", "familyReplayService", "familyReplayUiTest"],
    [
      "alt_text text not null",
      "transcript text",
      "Accessible media description is required",
      "altText: publication.alt_text",
      "Drafts, unreviewed media, and other families"
    ],
    "Family-visible media must retain accessible alt text or transcript and UI copy that distinguishes drafts and unreviewed media."
  );
  requirePattern(
    blockers,
    sources,
    "family-release-read-privacy",
    "FAMILY_READ_SUPPRESSION_MISSING",
    ["familyReplayService", "teamPortalAdapter", "dashboardAdapter"],
    [
      'media.moderation_status !== "approved"',
      "!media.family_release_approved_at",
      "media.storage_deleted_at",
      "media.private_object_path && !media.scan_completed_at",
      "!consent.revoked_at",
      /filter\(\(item[^\n]*\) => !item\.private_object_path \|\| Boolean\(item\.scan_completed_at && item\.family_release_approved_at\)\)/
    ],
    "Family and team read adapters must suppress draft, unscanned, revoked, deleted, hidden, or unapproved media."
  );
}

function verifyRetentionDeletionTakedownEvidence(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "retention-deletion-takedown-evidence",
    "RETENTION_STORAGE_DELETION_EVIDENCE_MISSING",
    ["operationalTruthMigration", "privateMediaService", "privacyDocs"],
    [
      "retention_delete_after timestamptz",
      "storage_deleted_at timestamptz",
      "storage_deletion_evidence_json jsonb not null default '{}'::jsonb",
      "idx_media_retention_due",
      /retention_delete_after:\s*new Date/,
      "retention date, and storage deletion proof remain auditable"
    ],
    "Retention deadlines, storage deletion timestamps, and deletion evidence must be present before production media-storage claims."
  );
  requirePattern(
    blockers,
    sources,
    "retention-deletion-takedown-evidence",
    "REPORT_MODERATION_TAKEDOWN_MISSING",
    ["reportRoute", "moderationRoute", "operations", "operationalTruthMigration", "privacyDocs"],
    [
      "reportMediaItem",
      "moderateMediaItem",
      'const statuses = new Set(["approved", "hidden", "rejected", "removed"])',
      "media_reported",
      "media_review_history",
      "consent_evidence_json",
      "Flag media for review",
      "Remove media links"
    ],
    "Abuse report, moderation/takedown states, review history, audit records, and consent evidence must remain present."
  );
  requirePattern(
    blockers,
    sources,
    "retention-deletion-takedown-evidence",
    "DELETION_PROOF_DOC_BOUNDARY_MISSING",
    ["runbook", "workPlan", "taskBoard"],
    [
      "deletion/retention proof",
      "abuse/takedown proof",
      "storage-provider setup",
      "production acceptance"
    ],
    "Docs must keep deletion/retention proof and abuse/takedown proof open before any production media-storage claim."
  );
}

function verifyOpenGatesDocumentation(sources, blockers) {
  for (const gate of OPEN_GATES) {
    const code = `OPEN_GATE_${gate.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/_$/, "")}_MISSING`;
    requirePattern(
      blockers,
      sources,
      "open-gates-documentation",
      code,
      ["runbook", "workPlan", "taskBoard"],
      new RegExp(gate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `Docs must explicitly name ${gate} as an open gate.`
    );
  }
  requirePattern(
    blockers,
    sources,
    "open-gates-documentation",
    "LOCAL_ONLY_PROOF_BOUNDARY_MISSING",
    ["runbook", "workPlan", "taskBoard"],
    [
      "qa:private-media-storage-readiness",
      "reads repository files only",
      "does not call Supabase",
      "sign in",
      "run Playwright",
      "upload media",
      "create storage objects",
      "call a scanner",
      "claim hosted, storage-provider, scanner-provider, or production acceptance"
    ],
    "Docs must describe the verifier as local repository readiness proof only with no hosted, provider, scanner, storage, or production acceptance claim."
  );
}

export function verifyPrivateMediaStorageReadiness(sources) {
  const blockers = [];
  const allKeys = Object.keys(DEFAULT_SOURCE_FILES);
  for (const key of allKeys) {
    if (typeof sources[key] !== "string") {
      addBlocker(blockers, "source", "SOURCE_FILE_MISSING", [key], "Required source file was not supplied to the verifier.");
    }
  }

  verifyUploadGatesAndAuthority(sources, blockers);
  verifyTenantQuarantineStorage(sources, blockers);
  verifyScannerProcessingEvidence(sources, blockers);
  verifyFamilyReleaseAndReadPrivacy(sources, blockers);
  verifyRetentionDeletionTakedownEvidence(sources, blockers);
  verifyOpenGatesDocumentation(sources, blockers);

  return {
    ok: blockers.length === 0,
    checkedFiles: allKeys.map((key) => DEFAULT_SOURCE_FILES[key]),
    blockers,
    families: [
      "upload-gates-authority",
      "tenant-quarantine-storage",
      "scanner-processing-evidence",
      "family-release-read-privacy",
      "retention-deletion-takedown-evidence",
      "open-gates-documentation"
    ],
    proofBoundary: "local repository-source readiness proof only",
    openGates: OPEN_GATES
  };
}

export function formatPrivateMediaStorageReadinessReport(result) {
  const lines = [];
  if (result.ok) {
    lines.push("Private media storage readiness verifier passed.");
    lines.push(`Checked ${result.checkedFiles.length} repository files without hosted credentials, network access, Supabase calls, browser automation, provider sends, storage uploads/downloads, scanner calls, seed writes, deploys, or mutations.`);
    lines.push(`Verified families: ${result.families.join(", ")}.`);
  } else {
    lines.push("Private media storage readiness verifier failed.");
    lines.push("");
    lines.push("Blockers:");
    for (const blocker of result.blockers) {
      lines.push(`- [${blocker.code}] ${blocker.family}: ${blocker.message}`);
      lines.push(`  Paths: ${blocker.paths.join(", ")}`);
    }
  }

  lines.push("");
  lines.push(`Proof boundary: ${result.proofBoundary}.`);
  lines.push("This verifier reads repository files only. It does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, upload media, create storage objects, download objects, call a scanner, call provider dashboards, configure secrets, deploy, or claim hosted, storage-provider, scanner-provider, or production acceptance.");
  lines.push("Still open before LPM-008 closure:");
  for (const gate of result.openGates) lines.push(`- ${gate}`);
  return lines.join("\n");
}

export function runPrivateMediaStorageReadinessCli(
  rootDir = process.cwd(),
  streams = { stdout: process.stdout, stderr: process.stderr }
) {
  const result = verifyPrivateMediaStorageReadiness(readRepositorySources(rootDir));
  const report = formatPrivateMediaStorageReadinessReport(result);
  if (result.ok) {
    streams.stdout.write(`${report}\n`);
    return 0;
  }
  streams.stderr.write(`${report}\n`);
  return 1;
}

function main() {
  process.exitCode = runPrivateMediaStorageReadinessCli();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
