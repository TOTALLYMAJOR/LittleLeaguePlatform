#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_SOURCE_FILES = {
  routeAuth: "lib/supabase/route-auth.ts",
  accessControl: "lib/supabase/access-control.ts",

  registrationApproveRoute: "app/api/admin/registration-requests/[requestId]/approve/route.ts",
  registrationRejectRoute: "app/api/admin/registration-requests/[requestId]/reject/route.ts",
  registrationService: "lib/supabase/registration-approvals.ts",
  registrationMigration: "supabase/migrations/0003_registration_approval_workflow.sql",
  guardianPolicyMigration: "supabase/migrations/0020_guardian_verification_policy.sql",
  registrationInvitationMigration: "supabase/migrations/0033_registration_invitation_issuance.sql",

  invitePreviewRoute: "app/api/invites/preview/route.ts",
  inviteAcceptRoute: "app/api/invites/accept/route.ts",
  inviteAcceptanceService: "lib/supabase/invite-acceptance.ts",
  parentInviteMigration: "supabase/migrations/0026_parent_invite_acceptance.sql",

  guardianRepairRoute: "app/api/admin/guardian-links/repair/route.ts",
  guardianLinksService: "lib/supabase/guardian-links.ts",

  additionalGuardianParentRoute: "app/api/parent/additional-guardians/route.ts",
  additionalGuardianReviewRoute: "app/api/admin/additional-guardians/[requestId]/review/route.ts",
  additionalGuardianService: "lib/supabase/additional-guardians.ts",
  additionalGuardianMigration: "supabase/migrations/0027_additional_guardian_requests.sql"
};

const sourceGroups = {
  registration: [
    "registrationApproveRoute",
    "registrationRejectRoute",
    "registrationService",
    "registrationMigration",
    "guardianPolicyMigration",
    "registrationInvitationMigration"
  ],
  invite: [
    "invitePreviewRoute",
    "inviteAcceptRoute",
    "inviteAcceptanceService",
    "parentInviteMigration"
  ],
  guardianRepair: [
    "guardianRepairRoute",
    "guardianLinksService",
    "accessControl"
  ],
  additionalGuardian: [
    "additionalGuardianParentRoute",
    "additionalGuardianReviewRoute",
    "additionalGuardianService",
    "additionalGuardianMigration"
  ]
};

const providerExecutorPatterns = [
  /@sendgrid\/mail/,
  /\btwilio\b/i,
  /\bweb-push\b/i,
  /\bsendMail\s*\(/,
  /\bmessages\.create\s*\(/,
  /\bsendNotification\s*\(/,
  /\bnotification_delivery_attempts\b/,
  /\bprovider_delivery\b/
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

function verifyRegistrationReview(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "registration-review",
    "REGISTRATION_APPROVAL_SESSION_REVIEWER_MISSING",
    ["registrationApproveRoute"],
    /requireAuthenticatedRouteUser\s*\([\s\S]*reviewerUserId:\s*auth\.user\.id/,
    "Registration approval must derive the reviewer from the verified route session."
  );
  requirePattern(
    blockers,
    sources,
    "registration-review",
    "REGISTRATION_REJECTION_SESSION_REVIEWER_MISSING",
    ["registrationRejectRoute"],
    /requireAuthenticatedRouteUser\s*\([\s\S]*reviewerUserId:\s*auth\.user\.id/,
    "Registration rejection must derive the reviewer from the verified route session."
  );
  requirePattern(
    blockers,
    sources,
    "registration-review",
    "REGISTRATION_REVIEW_EVIDENCE_MISSING",
    ["registrationService", "guardianPolicyMigration", "registrationInvitationMigration"],
    /note\?\.trim\(\)\.length[\s\S]*<\s*10[\s\S]*>\s*1000[\s\S]*registration_approval_actions_evidence_note_check/s,
    "Approval must require bounded review evidence in service code and staged SQL."
  );
  requirePattern(
    blockers,
    sources,
    "registration-review",
    "REGISTRATION_ADMIN_AUTHORITY_MISSING",
    ["guardianPolicyMigration", "registrationInvitationMigration"],
    /organization_memberships[\s\S]*membership\.user_id\s*=\s*reviewer_user_id[\s\S]*membership\.role\s*=\s*'admin'[\s\S]*membership\.status\s*=\s*'active'[\s\S]*revoke all on function public\.approve_registration_request/s,
    "Registration review authority must be active organization-admin scoped and service-role only."
  );
  requirePattern(
    blockers,
    sources,
    "registration-review",
    "REGISTRATION_MANUAL_INVITE_HASH_MISSING",
    ["registrationService", "registrationInvitationMigration"],
    /randomBytes\s*\(32\)[\s\S]*createHash\s*\(\s*"sha256"\s*\)[\s\S]*approve_registration_request_with_invitation[\s\S]*target_invite_token_hash[\s\S]*delivery_mode'?,\s*'manual_one_time_link'[\s\S]*provider_execution'?,\s*'not_started'/s,
    "Approval must create a server-generated hashed one-time manual invite, not a reversible or provider-sent credential."
  );
  requirePattern(
    blockers,
    sources,
    "registration-review",
    "REGISTRATION_SCOPE_AND_AUDIT_MISSING",
    ["registrationMigration", "registrationInvitationMigration", "registrationService"],
    /team_memberships[\s\S]*role[\s\S]*'parent'[\s\S]*player_guardians[\s\S]*status[\s\S]*'active'[\s\S]*audit_events[\s\S]*registration_invitation_issued[\s\S]*No email, SMS, push, or chat/s,
    "Registration approval must activate only parent child/team scope and record provider-free audit evidence."
  );
  requirePattern(
    blockers,
    sources,
    "registration-review",
    "REGISTRATION_REJECTION_AUDIT_MISSING",
    ["registrationService", "registrationMigration"],
    /reject_registration_request[\s\S]*rejection_note[\s\S]*registration_approval_actions[\s\S]*audit_events[\s\S]*registration_request_rejected/s,
    "Registration rejection must record review action and audit evidence."
  );
  requireNoProviderExecutors(blockers, sources, "registration-review", sourceGroups.registration);
}

function verifyInviteAcceptance(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "invite-acceptance",
    "INVITE_ACCEPTANCE_SESSION_ACTOR_MISSING",
    ["inviteAcceptRoute"],
    /requireAuthenticatedRouteUser\s*\([\s\S]*acceptParentInvite\s*\(\s*\{[\s\S]*userId:\s*auth\.user\.id/s,
    "Invite acceptance must derive the accepting adult from the verified route session."
  );
  requirePattern(
    blockers,
    sources,
    "invite-acceptance",
    "INVITE_HASH_LOOKUP_MISSING",
    ["inviteAcceptanceService"],
    /createHash\s*\(\s*"sha256"\s*\)[\s\S]*invite_token_hash[\s\S]*tokenHash\s*\(token\)[\s\S]*accept_parent_invite_by_hash[\s\S]*target_invite_token_hash:\s*tokenHash\s*\(input\.token\)/s,
    "Invite preview and acceptance must use hashed one-time token lookup."
  );
  requirePattern(
    blockers,
    sources,
    "invite-acceptance",
    "INVITE_REJECTION_STATES_MISSING",
    ["inviteAcceptanceService", "parentInviteMigration"],
    /status\s*=\s*'accepted'[\s\S]*already accepted[\s\S]*status\s*=\s*'revoked'[\s\S]*expires_at\s*<=\s*now\(\)[\s\S]*Signed-in email does not match this invitation/s,
    "Invite acceptance must reject invalid, already-accepted, expired, revoked, and wrong-account cases."
  );
  requirePattern(
    blockers,
    sources,
    "invite-acceptance",
    "INVITE_APPROVED_SCOPE_MISSING",
    ["parentInviteMigration"],
    /team\.id\s*=\s*invite_row\.team_id[\s\S]*team\.organization_id\s*=\s*invite_row\.organization_id[\s\S]*parent_invite_id\s*=\s*invite_row\.id[\s\S]*player_id\s*=\s*invite_row\.player_id[\s\S]*status\s*=\s*'invited'/s,
    "Invite acceptance must activate only the preapproved child/team scope from the invite."
  );
  requirePattern(
    blockers,
    sources,
    "invite-acceptance",
    "INVITE_PROVIDER_FREE_AUDIT_MISSING",
    ["parentInviteMigration"],
    /audit_events[\s\S]*parent_invite_accepted[\s\S]*No provider message was sent/s,
    "Invite acceptance must record provider-free audit evidence."
  );
  requireNoProviderExecutors(blockers, sources, "invite-acceptance", sourceGroups.invite);
}

function verifyGuardianRepair(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "guardian-link-repair",
    "GUARDIAN_REPAIR_SESSION_ACTOR_MISSING",
    ["guardianRepairRoute"],
    /requireAuthenticatedRouteUser\s*\([\s\S]*actorUserId:\s*auth\.user\.id/s,
    "Guardian repair must derive the repairing actor from the verified route session."
  );
  requirePattern(
    blockers,
    sources,
    "guardian-link-repair",
    "GUARDIAN_REPAIR_EVIDENCE_MISSING",
    ["guardianRepairRoute", "guardianLinksService"],
    /verificationNote[\s\S]*length\s*<\s*10[\s\S]*length\s*>\s*500/s,
    "Guardian repair must require bounded 10-500 character verification evidence."
  );
  requirePattern(
    blockers,
    sources,
    "guardian-link-repair",
    "GUARDIAN_REPAIR_ADMIN_AUTHORITY_MISSING",
    ["guardianLinksService", "accessControl"],
    /requireActiveOrganizationAdmin[\s\S]*organizationId:\s*input\.organizationId[\s\S]*userId:\s*input\.actorUserId[\s\S]*organization_memberships[\s\S]*role[\s\S]*"admin"[\s\S]*status[\s\S]*"active"/s,
    "Guardian repair must require active organization-admin access."
  );
  requirePattern(
    blockers,
    sources,
    "guardian-link-repair",
    "GUARDIAN_REPAIR_PARENT_PROFILE_MISSING",
    ["guardianLinksService"],
    /from\("profiles"\)[\s\S]*eq\("id",\s*input\.parentUserId\)[\s\S]*default_role !== "parent"/s,
    "Guardian repair must require an existing parent profile."
  );
  requirePattern(
    blockers,
    sources,
    "guardian-link-repair",
    "GUARDIAN_REPAIR_ORG_SCOPE_MISSING",
    ["guardianLinksService"],
    /from\("players"\)[\s\S]*eq\("id",\s*input\.playerId\)[\s\S]*eq\("organization_id",\s*input\.organizationId\)[\s\S]*team_id/s,
    "Guardian repair must prove the player belongs to the selected organization before activating team access."
  );
  requirePattern(
    blockers,
    sources,
    "guardian-link-repair",
    "GUARDIAN_REPAIR_AUDIT_MISSING",
    ["guardianLinksService"],
    /player_guardians[\s\S]*team_memberships[\s\S]*audit_events[\s\S]*guardian_link_repaired/s,
    "Guardian repair must write the scoped guardian/team membership change and audit row."
  );
  requireNoProviderExecutors(blockers, sources, "guardian-link-repair", sourceGroups.guardianRepair);
}

function verifyAdditionalGuardian(sources, blockers) {
  requirePattern(
    blockers,
    sources,
    "additional-guardian-review",
    "ADDITIONAL_GUARDIAN_SESSION_ACTORS_MISSING",
    ["additionalGuardianParentRoute", "additionalGuardianReviewRoute"],
    /requestAdditionalGuardian[\s\S]*actorUserId:\s*auth\.user\.id[\s\S]*reviewAdditionalGuardianRequest[\s\S]*actorUserId:\s*auth\.user\.id/s,
    "Additional guardian proposal and review routes must derive actors from verified sessions."
  );
  requirePattern(
    blockers,
    sources,
    "additional-guardian-review",
    "ADDITIONAL_GUARDIAN_ADMIN_REVIEW_MISSING",
    ["additionalGuardianService", "additionalGuardianMigration"],
    /requireActiveOrganizationAdmin[\s\S]*review additional guardian requests[\s\S]*review_reason[\s\S]*char_length\(trim\(review_reason\)\)\s*<\s*10[\s\S]*membership\.role\s*=\s*'admin'[\s\S]*membership\.status\s*=\s*'active'/s,
    "Additional guardian review must require active organization-admin authority and bounded review reason."
  );
  requirePattern(
    blockers,
    sources,
    "additional-guardian-review",
    "ADDITIONAL_GUARDIAN_STANDARD_SCOPE_MISSING",
    ["additionalGuardianMigration"],
    /requested_scope\s+text\[\][\s\S]*standard_linked_guardian_access[\s\S]*check\s*\(\s*requested_scope\s*=\s*array\['standard_linked_guardian_access'\]::text\[\]\s*\)/s,
    "Additional guardian access must be restricted to standard_linked_guardian_access."
  );
  requirePattern(
    blockers,
    sources,
    "additional-guardian-review",
    "ADDITIONAL_GUARDIAN_SCOPE_REVALIDATION_MISSING",
    ["additionalGuardianMigration"],
    /player\.id\s*=\s*request_row\.player_id[\s\S]*player\.team_id\s*=\s*request_row\.team_id[\s\S]*player\.organization_id\s*=\s*request_row\.organization_id[\s\S]*guardian\.parent_user_id\s*=\s*request_row\.proposed_by_user_id[\s\S]*guardian\.status\s*=\s*'active'/s,
    "Additional guardian approval must revalidate child, team, organization, season, and proposing-guardian scope."
  );
  requirePattern(
    blockers,
    sources,
    "additional-guardian-review",
    "ADDITIONAL_GUARDIAN_MANUAL_INVITE_MISSING",
    ["additionalGuardianService", "additionalGuardianMigration"],
    /randomBytes\s*\(32\)[\s\S]*createHash\s*\(\s*"sha256"\s*\)[\s\S]*approve_additional_guardian_request[\s\S]*target_invite_token_hash[\s\S]*manual_link_issued_at[\s\S]*No provider message was sent/s,
    "Additional guardian approval must issue only a hashed, manual, one-time invitation without provider sends."
  );
  requirePattern(
    blockers,
    sources,
    "additional-guardian-review",
    "ADDITIONAL_GUARDIAN_AUDIT_MISSING",
    ["additionalGuardianMigration"],
    /audit_events[\s\S]*additional_guardian_requested[\s\S]*audit_events[\s\S]*additional_guardian_request_rejected[\s\S]*audit_events[\s\S]*additional_guardian_request_approved/s,
    "Additional guardian lifecycle must record request, approval/rejection, and audit evidence."
  );
  requireNoPattern(
    blockers,
    sources,
    "additional-guardian-review",
    "ADDITIONAL_GUARDIAN_PROHIBITED_AUTHORITY_PRESENT",
    ["additionalGuardianService", "additionalGuardianMigration"],
    /\b(custody|medical|transport|schedule-edit|schedule_edit|publishing|onward-delegation|onward_delegation)\b/i,
    "Additional guardian code or SQL must not grant custody, medical, transport, schedule-edit, publishing, or onward-delegation authority."
  );
  requireNoProviderExecutors(blockers, sources, "additional-guardian-review", sourceGroups.additionalGuardian);
}

function requireNoProviderExecutors(blockers, sources, family, keys) {
  for (const pattern of providerExecutorPatterns) {
    requireNoPattern(
      blockers,
      sources,
      family,
      `${family.toUpperCase().replaceAll("-", "_")}_PROVIDER_EXECUTOR_PRESENT`,
      keys,
      pattern,
      "Access lifecycle authority verification is source-only and provider-free; provider executor calls belong in a separate approved send slice."
    );
  }
}

export function verifyAccessLifecycleAuthority(sources) {
  const blockers = [];
  const allKeys = Object.keys(DEFAULT_SOURCE_FILES);
  for (const key of allKeys) {
    if (typeof sources[key] !== "string") {
      addBlocker(blockers, "source", "SOURCE_FILE_MISSING", [key], "Required source file was not supplied to the verifier.");
    }
  }

  verifyRegistrationReview(sources, blockers);
  verifyInviteAcceptance(sources, blockers);
  verifyGuardianRepair(sources, blockers);
  verifyAdditionalGuardian(sources, blockers);

  return {
    ok: blockers.length === 0,
    checkedFiles: allKeys.map((key) => DEFAULT_SOURCE_FILES[key]),
    blockers
  };
}

export function formatAccessLifecycleAuthorityReport(result) {
  if (result.ok) {
    return [
      "Access lifecycle authority verifier passed.",
      `Checked ${result.checkedFiles.length} repository files without Supabase, browser, provider, seed, deploy, or hosted calls.`,
      "Proof boundary: local repository-source contract only; hosted UI proof and Supabase readback remain separate gates."
    ].join("\n");
  }

  return [
    "Access lifecycle authority verifier failed.",
    ...result.blockers.map((blocker) => {
      const paths = blocker.paths.join(", ");
      return `- [${blocker.code}] ${blocker.family}: ${blocker.message} (${paths})`;
    })
  ].join("\n");
}

function main() {
  const sources = readRepositorySources(process.cwd());
  const result = verifyAccessLifecycleAuthority(sources);
  const report = formatAccessLifecycleAuthorityReport(result);
  if (result.ok) {
    console.log(report);
    return;
  }
  console.error(report);
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
