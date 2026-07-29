#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SUPPORTED_EXPORT_KINDS = [
  "roster",
  "contacts",
  "schedule",
  "rsvps",
  "snacks",
  "volunteers",
  "sponsors",
  "notifications"
];

export const DEFAULT_SOURCE_FILES = {
  adminExportRoute: "app/api/admin/exports/route.ts",
  reporting: "lib/supabase/reporting.ts",
  reportingTest: "lib/supabase/reporting.test.ts",
  archiveVault: "lib/supabase/archive-vault.ts",
  adminSurfaces: "app/admin/_surfaces.tsx",
  reportsArchivePage: "app/admin/reports-archive/page.tsx",
  archivePage: "app/admin/archive/page.tsx",
  archivedSeasonMigration: "supabase/migrations/0013_archived_season_read_only.sql",
  rlsPolicyTest: "supabase/rls-policy.test.ts",
  archiveChecklist: "docs/archive-readiness-checklist.md",
  privacySecurity: "docs/privacy-security.md",
  capabilityMatrix: "docs/capability-matrix.md",
  userManual: "docs/user-manual.md",
  runbook: "docs/runbook.md",
  workPlan: "docs/missing-production-slices-work-plan.md",
  taskBoard: "docs/production-task-board.md"
};

export const OPEN_GATES = [
  "hosted RLS/admin export proof",
  "hosted archive smoke proof",
  "real season-close proof",
  "chat-retention cleanup proof",
  "deleted-chat readback proof",
  "backup/PITR/restore proof",
  "accessibility proof",
  "production archive acceptance"
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

function requireOrder(blockers, sources, family, code, keys, needles, message) {
  const text = combined(sources, keys);
  let position = -1;
  for (const needle of needles) {
    const nextPosition = text.indexOf(needle, position + 1);
    if (nextPosition === -1) {
      addBlocker(blockers, family, code, keys, message);
      return;
    }
    position = nextPosition;
  }
}

function extractSetValues(source, setName) {
  const match = source.match(new RegExp(`const\\s+${setName}\\s*=\\s*new\\s+Set\\s*\\(\\s*\\[([\\s\\S]*?)\\]\\s*\\)`));
  if (!match) return null;
  return Array.from(match[1].matchAll(/"([^"]+)"/g)).map((value) => value[1]);
}

function sameValues(actual, expected) {
  if (!actual || actual.length !== expected.length) return false;
  return expected.every((value) => actual.includes(value));
}

export function readRepositorySources(rootDir = process.cwd(), sourceFiles = DEFAULT_SOURCE_FILES) {
  return Object.fromEntries(
    Object.entries(sourceFiles).map(([key, relativePath]) => [
      key,
      readFileSync(resolve(rootDir, relativePath), "utf8")
    ])
  );
}

function verifyExportAuthority(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "export-authority",
    "EXPORT_ROUTE_SESSION_ACTOR_MISSING",
    ["adminExportRoute"],
    /requireAuthenticatedRouteUser\s*\(request\)[\s\S]*status:\s*401[\s\S]*createAdminExport\s*\(\{[\s\S]*actorUserId:\s*auth\.user\.id/s,
    "The admin export route must require a verified route user and pass auth.user.id as the export actor."
  );

  const routeKinds = extractSetValues(sources.adminExportRoute ?? "", "exportKinds");
  if (!sameValues(routeKinds, SUPPORTED_EXPORT_KINDS)) {
    addBlocker(
      blockers,
      "export-authority",
      "EXPORT_ROUTE_SUPPORTED_KINDS_WEAKENED",
      ["adminExportRoute"],
      `The route must accept only these export kinds: ${SUPPORTED_EXPORT_KINDS.join(", ")}.`
    );
  }

  requirePattern(
    blockers,
    sources,
    "export-authority",
    "EXPORT_SERVICE_CONTEXT_REJECTION_MISSING",
    ["reporting"],
    /if\s*\(!input\.organizationId\s*\|\|\s*!input\.actorUserId\)[\s\S]*Export requires organization and acting admin/s,
    "createAdminExport must reject missing organization or actor context before reading export data."
  );

  requireOrder(
    blockers,
    sources,
    "export-authority",
    "EXPORT_SERVICE_ACTIVE_ADMIN_GATE_MISSING",
    ["reporting"],
    [
      '.from("organization_memberships")',
      '.eq("organization_id", input.organizationId)',
      '.eq("user_id", input.actorUserId)',
      '.eq("role", "admin")',
      '.eq("status", "active")',
      "Only active organization admins can export league reports",
      '.from("teams")'
    ],
    "createAdminExport must prove active selected-organization admin membership before any export data reads."
  );
}

function verifyExportIsolation(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "export-isolation",
    "EXPORT_BASE_ORGANIZATION_SCOPE_MISSING",
    ["reporting"],
    /\.from\("teams"\)[\s\S]*\.eq\("organization_id",\s*input\.organizationId\)[\s\S]*\.from\("players"\)[\s\S]*\.eq\("organization_id",\s*input\.organizationId\)[\s\S]*\.from\("events"\)[\s\S]*\.eq\("organization_id",\s*input\.organizationId\)[\s\S]*const teamIds = new Set[\s\S]*const playerIds = new Set[\s\S]*const eventIds = new Set/s,
    "Roster, schedule, RSVP, snack, volunteer, and contact exports must start from selected-organization teams, players, and events."
  );
  requirePattern(
    blockers,
    sources,
    "export-isolation",
    "CONTACTS_PLAYER_SCOPE_MISSING",
    ["reporting", "reportingTest"],
    /\.from\("player_guardians"\)[\s\S]*\.in\("player_id",\s*Array\.from\(playerIds\)\)[\s\S]*not\.toContain\("Other Tenant Parent"\)[\s\S]*not\.toContain\("other@example\.com"\)/s,
    "Contact exports must read guardians through selected-organization player IDs and keep cross-tenant regression coverage."
  );
  requirePattern(
    blockers,
    sources,
    "export-isolation",
    "RSVP_EVENT_PLAYER_SCOPE_MISSING",
    ["reporting"],
    /\.from\("rsvps"\)[\s\S]*\.in\("event_id",\s*Array\.from\(eventIds\)\)[\s\S]*\.in\("player_id",\s*Array\.from\(playerIds\)\)/s,
    "RSVP exports must be scoped through selected-organization event and player ID sets."
  );
  requirePattern(
    blockers,
    sources,
    "export-isolation",
    "SNACK_TEAM_EVENT_SCOPE_MISSING",
    ["reporting"],
    /\.from\("snack_schedule_slots"\)[\s\S]*\.in\("team_id",\s*Array\.from\(teamIds\)\)[\s\S]*\.in\("event_id",\s*Array\.from\(eventIds\)\)/s,
    "Snack exports must be scoped through selected-organization team and event ID sets."
  );
  requirePattern(
    blockers,
    sources,
    "export-isolation",
    "VOLUNTEER_TEAM_SCOPE_MISSING",
    ["reporting"],
    /\.from\("volunteer_signups"\)[\s\S]*\.in\("team_id",\s*Array\.from\(teamIds\)\)/s,
    "Volunteer exports must be scoped through selected-organization team IDs."
  );
  requirePattern(
    blockers,
    sources,
    "export-isolation",
    "SPONSOR_NOTIFICATION_ORG_SCOPE_MISSING",
    ["reporting"],
    /\.from\("sponsors"\)[\s\S]*\.eq\("organization_id",\s*input\.organizationId\)[\s\S]*\.from\("notifications"\)[\s\S]*\.eq\("organization_id",\s*input\.organizationId\)/s,
    "Sponsor and notification exports must remain directly scoped to the selected organization."
  );
  requirePattern(
    blockers,
    sources,
    "export-isolation",
    "PROFILE_LOOKUP_NARROWING_MISSING",
    ["reporting", "reportingTest"],
    /profileIds\.add[\s\S]*\.from\("profiles"\)[\s\S]*\.select\("id,display_name,email,phone"\)[\s\S]*\.in\("id",\s*Array\.from\(profileIds\)\)[\s\S]*profileById[\s\S]*expect\(profileQuery\?\.filters\)\.toContainEqual\(\{[\s\S]*column:\s*"id"[\s\S]*value:\s*\["parent-a"\]/s,
    "Profile/contact data must be joined only after collecting IDs from scoped export rows."
  );
}

function verifyAuditAndFileTruth(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "audit-file-truth",
    "EXPORT_AUDIT_EVENT_MISSING",
    ["reporting"],
    /db\.from\("audit_events"\)\.insert\(\{[\s\S]*organization_id:\s*input\.organizationId[\s\S]*actor_user_id:\s*input\.actorUserId[\s\S]*action:\s*"admin_export_created"[\s\S]*target_type:\s*"report_export"/s,
    "Successful exports must write selected-organization admin_export_created audit evidence."
  );
  requirePattern(
    blockers,
    sources,
    "audit-file-truth",
    "EXPORT_CSV_FILE_CONTRACT_MISSING",
    ["reporting"],
    /filename:\s*`\$\{input\.kind\}-export\.csv`[\s\S]*contentType:\s*"text\/csv"[\s\S]*csv:\s*toCsv\(rows\)/s,
    "Successful exports must return CSV content with deterministic filename and text/csv content type."
  );
  requirePattern(
    blockers,
    sources,
    "audit-file-truth",
    "CSV_ESCAPE_MISSING",
    ["reporting"],
    /function csvEscape[\s\S]*\/\[",\\n\]\/\.test\(text\)[\s\S]*text\.replaceAll\('"',\s*'""'\)/s,
    "CSV generation must escape quotes, commas, and newlines."
  );
  requirePattern(
    blockers,
    sources,
    "audit-file-truth",
    "EXPORT_FAIL_CLOSED_MISSING",
    ["reporting"],
    /catch\s*\{[\s\S]*ok:\s*false,\s*message:\s*"Admin export could not reach Supabase\."/s,
    "Export generation must fail closed when Supabase is unavailable."
  );
}

function verifyArchiveSafety(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "archive-safety",
    "ARCHIVE_ROUTES_SURFACE_MISSING",
    ["reportsArchivePage", "archivePage"],
    /AdminReportsArchiveSurface[\s\S]*force-dynamic[\s\S]*AdminReportsArchiveSurface[\s\S]*force-dynamic/s,
    "/admin/reports-archive and /admin/archive must keep using the shared archive vault surface."
  );
  requirePattern(
    blockers,
    sources,
    "archive-safety",
    "ARCHIVE_SURFACE_ADMIN_GATE_MISSING",
    ["adminSurfaces"],
    /export async function AdminReportsArchiveSurface\(\) \{\s*const pageAccess = await requireAdminPageAccess\(\);\s*if \(!pageAccess\.ok\) return <AdminAccessDeniedSurface message=\{pageAccess\.message\} \/>;\s*const data = await listArchiveVaultData\(\);/s,
    "Archive surfaces must remain admin-only through requireAdminPageAccess."
  );
  requirePattern(
    blockers,
    sources,
    "archive-safety",
    "ARCHIVE_VAULT_READABLE_EXPORTABLE_LOCKED_COPY_MISSING",
    ["adminSurfaces", "archiveVault", "userManual"],
    /Archived seasons stay readable, exportable, and mutation-locked[\s\S]*Archived event and RSVP writes are blocked by active-season RLS checks[\s\S]*Use `\/api\/admin\/exports` before closing a season archive[\s\S]*Archived seasons and archived teams are read-only for current write paths/s,
    "Archive vault copy must keep archived seasons readable, exportable, and mutation-locked."
  );
  requirePattern(
    blockers,
    sources,
    "archive-safety",
    "ARCHIVE_LOCAL_FALLBACK_LABEL_MISSING",
    ["archiveVault"],
    /Showing local archive vault records until Supabase archive rows are available/s,
    "Fallback archive data must be labeled local until Supabase archive rows are available."
  );
  requirePattern(
    blockers,
    sources,
    "archive-safety",
    "ARCHIVED_SEASON_MUTATION_LOCK_PROOF_MISSING",
    ["archivedSeasonMigration", "rlsPolicyTest"],
    /Keep archived seasons readable but block new write paths[\s\S]*current_team_season_is_active[\s\S]*keeps archived seasons readable but mutation-locked[\s\S]*coaches and admins manage active season events[\s\S]*parents can upsert active linked child rsvps/s,
    "Archived-season RLS proof must keep read access separate from mutation-locked write paths."
  );
}

function verifyRetentionSeparation(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "retention-separation",
    "ARCHIVE_CHAT_RETENTION_CHECKLIST_MISSING",
    ["archiveChecklist"],
    /Preserve non-chat season data for league records and family history[\s\S]*Run chat retention cleanup before archive proof[\s\S]*deleted chat message text is no longer present in app-readable `team_chat_messages`[\s\S]*moderation audit metadata without reconstructing deleted message bodies/s,
    "The archive checklist must separate non-chat season preservation from chat text retention and deletion proof."
  );
  requirePattern(
    blockers,
    sources,
    "retention-separation",
    "PRIVACY_DELETED_CHAT_BODY_BOUNDARY_MISSING",
    ["privacySecurity"],
    /Archived seasons preserve non-chat records as read-only[\s\S]*Audit logs should not store unnecessary child-sensitive free text or deleted chat message bodies/s,
    "Privacy/security docs must preserve non-chat archive records without retaining deleted chat bodies in audit metadata."
  );
  requirePattern(
    blockers,
    sources,
    "retention-separation",
    "REPORTING_ARCHIVE_MATRIX_RETENTION_BOUNDARY_MISSING",
    ["capabilityMatrix", "userManual"],
    /Reporting and archive[\s\S]*Archive checklist requires non-chat season preservation and chat-retention deletion proof[\s\S]*Archived non-chat records may remain visible as read-only/s,
    "Capability and manual docs must keep chat retention/deletion proof separate from non-chat archive visibility."
  );
}

function verifyOpenGates(sources, blockers) {
  const docs = ["runbook", "workPlan", "taskBoard"];
  requirePattern(
    blockers,
    sources,
    "open-gates",
    "LOCAL_READINESS_BOUNDARY_DOCS_MISSING",
    docs,
    /qa:reporting-archive-readiness[\s\S]*local repository readiness proof only[\s\S]*does not call Supabase[\s\S]*sign in[\s\S]*run Playwright[\s\S]*seed data[\s\S]*mutate hosted records/s,
    "Runbook and planning docs must describe the verifier as local repository readiness proof only."
  );

  const combinedDocs = combined(sources, docs);
  for (const gate of OPEN_GATES) {
    if (!combinedDocs.includes(gate)) {
      addBlocker(
        blockers,
        "open-gates",
        `OPEN_GATE_${gate.toUpperCase().replaceAll(/[^A-Z0-9]+/g, "_")}_MISSING`,
        docs,
        `Docs and verifier output must explicitly leave ${gate} open.`
      );
    }
  }
}

export function verifyReportingArchiveReadiness(sources) {
  const blockers = [];

  verifyExportAuthority(sources, blockers);
  verifyExportIsolation(sources, blockers);
  verifyAuditAndFileTruth(sources, blockers);
  verifyArchiveSafety(sources, blockers);
  verifyRetentionSeparation(sources, blockers);
  verifyOpenGates(sources, blockers);

  return {
    ok: blockers.length === 0,
    blockers,
    families: [
      "export-authority",
      "export-isolation",
      "audit-file-truth",
      "archive-safety",
      "retention-separation",
      "open-gates"
    ],
    proofBoundary: "local repository readiness proof only",
    openGates: OPEN_GATES
  };
}

export function formatReportingArchiveReadinessReport(result) {
  const lines = [];
  if (!result.ok) {
    lines.push("Reporting and archive readiness blocked.");
    lines.push("");
    lines.push("Blockers:");
    for (const blocker of result.blockers) {
      lines.push(`- ${blocker.code} [${blocker.family}]: ${blocker.message}`);
      lines.push(`  Paths: ${blocker.paths.join(", ")}`);
    }
  } else {
    lines.push("Reporting and archive readiness passed.");
    lines.push("");
    lines.push(`Verified families: ${result.families.join(", ")}.`);
  }

  lines.push("");
  lines.push(`Proof boundary: ${result.proofBoundary}.`);
  lines.push("This verifier reads repository files only. It does not call Supabase, sign in, run Playwright, seed data, mutate hosted records, run archive close, delete chat records, call provider dashboards, upload or download files, deploy, configure secrets, or claim hosted RLS, browser, retention, restore, or production acceptance.");
  lines.push("Still open before LPM-011 closure:");
  for (const gate of result.openGates) lines.push(`- ${gate}`);
  return lines.join("\n");
}

export function runReportingArchiveReadinessCli(rootDir = process.cwd(), streams = { stdout: process.stdout, stderr: process.stderr }) {
  const result = verifyReportingArchiveReadiness(readRepositorySources(rootDir));
  const report = formatReportingArchiveReadinessReport(result);
  if (result.ok) {
    streams.stdout.write(`${report}\n`);
    return 0;
  }
  streams.stderr.write(`${report}\n`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runReportingArchiveReadinessCli();
}
