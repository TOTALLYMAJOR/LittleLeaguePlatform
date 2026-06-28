import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface SecurityProofItem {
  title: string;
  status: "covered" | "missing";
  evidence: string;
  source: string;
}

const projectRoot = process.cwd();
const rlsProofSource = "scripts/verify-rls-boundaries.mjs";
const archivedSeasonMigrationSource = "supabase/migrations/0013_archived_season_read_only.sql";
const guardianRsvpMigrationSource = "supabase/migrations/0012_rsvp_guardian_scope.sql";
const membershipsSource = "lib/supabase/memberships.ts";

const sourceBodies: Record<string, string> = {
  [rlsProofSource]: readFileSync(join(projectRoot, "scripts", "verify-rls-boundaries.mjs"), "utf8"),
  [archivedSeasonMigrationSource]: readFileSync(join(projectRoot, "supabase", "migrations", "0013_archived_season_read_only.sql"), "utf8"),
  [guardianRsvpMigrationSource]: readFileSync(join(projectRoot, "supabase", "migrations", "0012_rsvp_guardian_scope.sql"), "utf8"),
  [membershipsSource]: readFileSync(join(projectRoot, "lib", "supabase", "memberships.ts"), "utf8")
};

function proof(title: string, source: string, needle: string, evidence: string): SecurityProofItem {
  const body = sourceBodies[source] ?? "";
  return {
    title,
    status: body.includes(needle) ? "covered" : "missing",
    evidence,
    source
  };
}

export function buildSecurityProofDashboard(): SecurityProofItem[] {
  return [
    proof(
      "Cross-team access denial",
      rlsProofSource,
      "parent cannot read cross-team players",
      "Live QA proof signs in as the parent and expects zero rows for another team's player."
    ),
    proof(
      "Archived season read-only writes",
      archivedSeasonMigrationSource,
      "current_team_season_is_active",
      "RLS write policies require active team seasons before team branding, event, or RSVP mutation."
    ),
    proof(
      "Archived season live denial",
      rlsProofSource,
      "coach cannot update archived-season events",
      "Live QA proof signs in as a coach with archived-team membership and expects the archived event update to be denied."
    ),
    proof(
      "Guardian-scoped RSVP writes",
      guardianRsvpMigrationSource,
      "parents can upsert linked child rsvps",
      "RLS requires active guardian links and same-team player/event pairs for parent RSVP writes."
    ),
    proof(
      "Production audit log coverage",
      membershipsSource,
      "team_membership_saved",
      "Admin membership changes create audit_events with actor, target, action, and organization scope."
    )
  ];
}
