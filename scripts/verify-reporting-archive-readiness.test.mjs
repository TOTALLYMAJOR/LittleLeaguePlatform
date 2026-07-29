import assert from "node:assert/strict";
import test from "node:test";

import {
  formatReportingArchiveReadinessReport,
  readRepositorySources,
  verifyReportingArchiveReadiness
} from "./verify-reporting-archive-readiness.mjs";

const fixtureSources = readRepositorySources();

function cloneSources() {
  return { ...fixtureSources };
}

function codesFor(result, family) {
  return result.blockers
    .filter((blocker) => blocker.family === family)
    .map((blocker) => blocker.code);
}

test("passes against repository source fixtures without hosted credentials or external access", () => {
  const result = verifyReportingArchiveReadiness(cloneSources());
  const report = formatReportingArchiveReadinessReport(result);

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockers, []);
  assert.match(report, /local repository readiness proof only/);
  assert.match(report, /hosted RLS\/admin export proof/);
  assert.match(report, /backup\/PITR\/restore proof/);
  assert.match(report, /does not call Supabase/);
});

test("fails export authority readiness when the route actor stops using the verified session", () => {
  const sources = cloneSources();
  sources.adminExportRoute = sources.adminExportRoute.replace(
    "actorUserId: auth.user.id",
    "actorUserId: String(body.actorUserId)"
  );

  const result = verifyReportingArchiveReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "export-authority").includes("EXPORT_ROUTE_SESSION_ACTOR_MISSING"));
});

test("fails export isolation readiness when profile joins are no longer narrowed to scoped IDs", () => {
  const sources = cloneSources();
  sources.reporting = sources.reporting.replace(
    '.in("id", Array.from(profileIds))',
    '.select("id,display_name,email,phone")'
  );

  const result = verifyReportingArchiveReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "export-isolation").includes("PROFILE_LOOKUP_NARROWING_MISSING"));
});

test("fails audit and file truth readiness when export audit evidence is removed", () => {
  const sources = cloneSources();
  sources.reporting = sources.reporting.replaceAll(
    "admin_export_created",
    "admin_export_logged"
  );

  const result = verifyReportingArchiveReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "audit-file-truth").includes("EXPORT_AUDIT_EVENT_MISSING"));
});

test("fails archive safety readiness when the archive surface drops its admin page gate", () => {
  const sources = cloneSources();
  sources.adminSurfaces = sources.adminSurfaces.replace(
    /export async function AdminReportsArchiveSurface\(\) \{\n  const pageAccess = await requireAdminPageAccess\(\);\n  if \(!pageAccess\.ok\) return <AdminAccessDeniedSurface message=\{pageAccess\.message\} \/>;/,
    "export async function AdminReportsArchiveSurface() {"
  );

  const result = verifyReportingArchiveReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "archive-safety").includes("ARCHIVE_SURFACE_ADMIN_GATE_MISSING"));
});

test("fails retention separation readiness when deleted chat readback proof is removed", () => {
  const sources = cloneSources();
  sources.archiveChecklist = sources.archiveChecklist.replace(
    "Confirm deleted chat message text is no longer present in app-readable `team_chat_messages`.",
    "Confirm chat cleanup completed."
  );

  const result = verifyReportingArchiveReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(codesFor(result, "retention-separation").includes("ARCHIVE_CHAT_RETENTION_CHECKLIST_MISSING"));
});

test("fails open-gates readiness when backup restore proof is no longer named", () => {
  const sources = cloneSources();
  sources.runbook = sources.runbook.replaceAll("backup/PITR/restore proof", "backup proof");
  sources.workPlan = sources.workPlan.replaceAll("backup/PITR/restore proof", "backup proof");
  sources.taskBoard = sources.taskBoard.replaceAll("backup/PITR/restore proof", "backup proof");

  const result = verifyReportingArchiveReadiness(sources);

  assert.equal(result.ok, false);
  assert.ok(
    codesFor(result, "open-gates").some((code) =>
      code.includes("OPEN_GATE_BACKUP_PITR_RESTORE_PROOF_MISSING")
    )
  );
});
