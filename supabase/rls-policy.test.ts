import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function migration(name: string) {
  return readFileSync(join(process.cwd(), "supabase", "migrations", name), "utf8");
}

describe("Supabase RLS policy coverage", () => {
  const core = migration("0001_core_schema.sql");
  const hardening = migration("0002_platform_hardening.sql");
  const provider = migration("0005_provider_and_mobile_hardening.sql");
  const teamBroadcast = migration("0006_team_broadcast_notifications.sql");
  const sponsorStatus = migration("0007_sponsor_v2_status.sql");
  const mediaGovernance = migration("0008_media_governance.sql");
  const tenantThemeDefaults = migration("0009_tenant_theme_defaults.sql");
  const mobileDecisionMetrics = migration("0010_mobile_decision_metrics.sql");
  const providerDeliveryApproval = migration("0011_provider_delivery_approval.sql");
  const rsvpGuardianScope = migration("0012_rsvp_guardian_scope.sql");
  const archivedSeasonReadOnly = migration("0013_archived_season_read_only.sql");
  const teamLifecycleStatus = migration("0014_team_lifecycle_status.sql");
  const teamLogoAssets = migration("0015_team_logo_assets.sql");
  const rsvpCancellations = migration("0016_rsvp_cancellations.sql");
  const sponsorBillingAndTeamBuilder = migration("0017_sponsor_billing_and_team_builder.sql");
  const teamBrandProfilesMonitoring = migration("0018_team_brand_profiles_monitoring.sql");
  const guardianVerification = migration("0020_guardian_verification_policy.sql");
  const drillVideoReferences = migration("0022_drill_video_references.sql");
  const coordinationLoops = migration("0024_coordination_loops.sql");
  const transportation = migration("0028_transportation_responsibility.sql");
  const securityDefinerHardening = migration("20260724143554_security_definer_execution_hardening.sql");
  const dataApiServiceRoleGrants = migration("20260726134836_data_api_service_role_grants.sql");
  const extensionHardening = migration("20260726142404_relocate_btree_gist_extension.sql");
  const guardianRevocationFix = migration(
    "20260726143452_fix_additional_guardian_revocation_ambiguity.sql"
  );
  const rlsHelperExecution = migration(
    "20260726143938_restrict_rls_helper_execution.sql"
  );
  const anonymousRlsPolicyEvaluation = migration(
    "20260726144407_restore_anon_rls_policy_evaluation.sql"
  );
  const packageJson = readFileSync(join(process.cwd(), "package.json"), "utf8");
  const rlsProof = readFileSync(join(process.cwd(), "scripts", "verify-rls-boundaries.mjs"), "utf8");
  const migrationPush = readFileSync(join(process.cwd(), "scripts", "supabase-push.mjs"), "utf8");

  it("keeps parent, coach, and admin team boundaries explicit", () => {
    expect(core).toContain("create policy \"team members can read players\"");
    expect(core).toContain("alter table public.rsvps enable row level security");
    expect(rsvpGuardianScope).toContain("create policy \"parents can upsert linked child rsvps\"");
    expect(rsvpGuardianScope).toContain("guardian.status = 'active'");
    expect(rsvpGuardianScope).toContain("player.team_id = event.team_id");
    expect(core).toContain("create policy \"coaches and admins update team branding\"");
    expect(core).toContain("create policy \"team members can create chat messages\"");
    expect(core).toContain("create policy \"coaches and admins can moderate chat messages\"");
  });

  it("keeps production chat hardening and read receipt policies present", () => {
    expect(hardening).toContain("create table public.team_chat_message_reads");
    expect(hardening).toContain("create policy \"users manage own chat reads\"");
    expect(hardening).toContain("create table public.team_chat_reports");
    expect(hardening).toContain("create policy \"team members create chat reports\"");
  });

  it("keeps provider/mobile hardening for media moderation, Realtime, and retention", () => {
    expect(provider).toContain("moderation_status");
    expect(provider).toContain("purge_expired_team_chat_messages");
    expect(provider).toContain("alter publication supabase_realtime add table public.team_chat_messages");
  });

  it("keeps team broadcast notification drafts compatible with Supabase", () => {
    expect(teamBroadcast).toContain("drop constraint if exists notifications_notification_type_check");
    expect(teamBroadcast).toContain("'team_broadcast'");
  });

  it("keeps sponsor status workflow compatible with pending, active, and expired states", () => {
    expect(sponsorStatus).toContain("drop constraint if exists sponsors_status_check");
    expect(sponsorStatus).toContain("'pending'");
    expect(sponsorStatus).toContain("'active'");
    expect(sponsorStatus).toContain("'expired'");
  });

  it("keeps media governance compatible with hide, restore, remove, and visibility states", () => {
    expect(mediaGovernance).toContain("media_items_moderation_status_check");
    expect(mediaGovernance).toContain("'hidden'");
    expect(mediaGovernance).toContain("'removed'");
    expect(mediaGovernance).toContain("visibility in ('team', 'organization')");
  });

  it("keeps tenant theme defaults available for future teams", () => {
    expect(tenantThemeDefaults).toContain("default_theme_key");
    expect(tenantThemeDefaults).toContain("default_primary_color");
    expect(tenantThemeDefaults).toContain("logo_status");
  });

  it("keeps mobile decision metrics auditable for PWA and native app decisions", () => {
    expect(mobileDecisionMetrics).toContain("create table if not exists public.mobile_usage_events");
    expect(mobileDecisionMetrics).toContain("'install_prompt_shown'");
    expect(mobileDecisionMetrics).toContain("'push_permission_requested'");
    expect(mobileDecisionMetrics).toContain("organization admins read mobile usage events");
  });

  it("keeps provider delivery approval gated before external sends", () => {
    expect(providerDeliveryApproval).toContain("provider_approval_status");
    expect(providerDeliveryApproval).toContain("'approved'");
    expect(providerDeliveryApproval).toContain("'rejected'");
    expect(providerDeliveryApproval).toContain("approved_by_user_id");
  });

  it("keeps the real-session RLS QA proof wired", () => {
    expect(packageJson).toContain("\"qa:rls-proof\": \"node scripts/verify-rls-boundaries.mjs\"");
    expect(rlsProof).toContain("signInWithPassword");
    expect(rlsProof).toContain("parent cannot update weather alerts");
    expect(rlsProof).toContain("parent cannot RSVP for unlinked player");
    expect(rlsProof).toContain("parent cannot read cross-team players");
    expect(rlsProof).toContain("coach cannot update archived-season events");
    expect(rlsProof).toContain("anonymous cannot read private teams");
  });

  it("keeps migration promotion target-bound, dry-run-first, and seed-opt-in", () => {
    expect(packageJson).toContain("\"supabase:plan\": \"node scripts/supabase-push.mjs --dry-run\"");
    expect(migrationPush).toContain("SUPABASE_MIGRATION_TARGET_REF");
    expect(migrationPush).toContain("SUPABASE_MIGRATION_TARGET_ENV");
    expect(migrationPush).toContain("SUPABASE_MIGRATION_CONFIRM");
    expect(migrationPush).toContain("\"--dry-run\"");
    expect(migrationPush).toContain("SUPABASE_MIGRATION_INCLUDE_SEED");
    expect(migrationPush).toContain("Seed data is forbidden for production migration promotion.");
    expect(migrationPush).toContain("const pushArgs = [");
    expect(migrationPush).toContain('runSupabase([...pushArgs, "--dry-run"])');
    expect(migrationPush).toContain('runSupabase([...pushArgs, "--yes"])');
    expect(migrationPush).toContain("transaction-pooler URLs (port 6543)");
    expect(migrationPush).toContain("\"--no-install\", \"supabase\"");
  });

  it("keeps archived seasons readable but mutation-locked", () => {
    expect(archivedSeasonReadOnly).toContain("current_team_season_is_active");
    expect(archivedSeasonReadOnly).toContain("coaches and admins manage active season events");
    expect(archivedSeasonReadOnly).toContain("parents can upsert active linked child rsvps");
  });

  it("keeps team lifecycle status available for archiving", () => {
    expect(teamLifecycleStatus).toContain("add column if not exists status");
    expect(teamLifecycleStatus).toContain("'archived'");
    expect(teamLifecycleStatus).toContain("current_team_is_active");
  });

  it("keeps team logo assets admin-reviewed", () => {
    expect(teamLogoAssets).toContain("create table if not exists public.team_logo_assets");
    expect(teamLogoAssets).toContain("organization admins manage team logo assets");
    expect(teamLogoAssets).toContain("team members read approved team logo assets");
  });

  it("keeps RSVP cancellation as retained history", () => {
    expect(rsvpCancellations).toContain("'cancelled'");
    expect(rsvpCancellations).toContain("rsvps_response_check");
  });

  it("keeps sponsor billing and automatic team-builder proof admin-only", () => {
    expect(sponsorBillingAndTeamBuilder).toContain("create table if not exists public.sponsor_billing_records");
    expect(sponsorBillingAndTeamBuilder).toContain("stripe_product_id");
    expect(sponsorBillingAndTeamBuilder).toContain("public_display_separated boolean not null default true");
    expect(sponsorBillingAndTeamBuilder).toContain("organization admins manage sponsor billing records");
    expect(sponsorBillingAndTeamBuilder).toContain("create table if not exists public.team_build_plans");
    expect(sponsorBillingAndTeamBuilder).toContain("assignments jsonb");
    expect(sponsorBillingAndTeamBuilder).toContain("organization admins manage team build plans");
  });

  it("keeps registration approval guardian access admin-reviewed with evidence", () => {
    expect(guardianVerification).toContain("membership.role = 'admin'");
    expect(guardianVerification).not.toContain("membership.role = 'coach'");
    expect(guardianVerification).toContain("registration_approval_actions_evidence_note_check");
    expect(guardianVerification).toContain("length(trim(coalesce(note, ''))) >= 10");
  });

  it("keeps team brand profiles coach/admin managed with monitoring proof", () => {
    expect(teamBrandProfilesMonitoring).toContain("create table if not exists public.team_brand_profiles");
    expect(teamBrandProfilesMonitoring).toContain("logo_url text");
    expect(teamBrandProfilesMonitoring).toContain("banner_image_url text");
    expect(teamBrandProfilesMonitoring).toContain("accent_color text not null");
    expect(teamBrandProfilesMonitoring).toContain("hero_copy text not null");
    expect(teamBrandProfilesMonitoring).toContain("create table if not exists public.team_brand_surface_validation_runs");
    expect(teamBrandProfilesMonitoring).toContain("coverage_percent integer not null check (coverage_percent between 0 and 100)");
    expect(teamBrandProfilesMonitoring).toContain("create table if not exists public.brand_monitoring_events");
    expect(teamBrandProfilesMonitoring).toContain("'brand_profile_published'");
    expect(teamBrandProfilesMonitoring).toContain("'brand_render_failed'");
    expect(teamBrandProfilesMonitoring).toContain("coaches and admins manage team brand profiles");
    expect(teamBrandProfilesMonitoring).toContain("team members read published brand profiles");
    expect(teamBrandProfilesMonitoring).toContain("public.current_user_can_manage_team(team_id)");
  });

  it("keeps drill video references admin-reviewed and coach-planning only", () => {
    expect(drillVideoReferences).toContain("create table if not exists public.drill_videos");
    expect(drillVideoReferences).toContain("create table if not exists public.drill_video_sources");
    expect(drillVideoReferences).toContain("create table if not exists public.drill_video_assignments");
    expect(drillVideoReferences).toContain("approval_status in ('pending', 'approved', 'rejected', 'retired')");
    expect(drillVideoReferences).toContain("visible_to_families boolean not null default false check (visible_to_families = false)");
    expect(drillVideoReferences).toContain("org admins manage drill video sources");
    expect(drillVideoReferences).toContain("coaches submit drill videos for their organizations");
    expect(drillVideoReferences).toContain("coaches read approved drill videos");
    expect(drillVideoReferences).toContain("org admins review drill videos");
    expect(drillVideoReferences).toContain("coaches manage coach-only drill assignments");
    expect(drillVideoReferences).toContain("membership.role = 'coach'");
  });

  it("keeps all five coordination loops role-scoped and human-reviewed", () => {
    expect(coordinationLoops).toContain("create table if not exists public.practice_run_receipts");
    expect(coordinationLoops).toContain("coaches and admins manage practice run receipts");
    expect(coordinationLoops).toContain("create table if not exists public.family_event_handoffs");
    expect(coordinationLoops).toContain("guardian.parent_user_id = auth.uid()");
    expect(coordinationLoops).toContain("create table if not exists public.game_day_resolution_reviews");
    expect(coordinationLoops).toContain("p_decision not in ('monitor', 'confirm_on_time', 'delay', 'cancel')");
    expect(coordinationLoops).toContain("Only assigned coaches or organization admins can resolve a game-day event.");
    expect(coordinationLoops).toContain("create or replace function public.commit_roster_import");
    expect(coordinationLoops).toContain("create or replace function public.rollback_roster_import");
    expect(coordinationLoops).toContain("'providerSendsExecuted', 0");
    expect(coordinationLoops).toContain("grant execute on function public.apply_game_day_resolution");
  });

  it("keeps privileged security-definer entry points server-only", () => {
    expect(securityDefinerHardening).toContain(
      "revoke all on function public.approve_registration_request(uuid, uuid, text)"
    );
    expect(securityDefinerHardening).toContain(
      "revoke all on function public.reject_registration_request(uuid, uuid, text)"
    );
    expect(securityDefinerHardening).toContain(
      "revoke all on function public.purge_expired_team_chat_messages(timestamptz)"
    );
    expect(securityDefinerHardening).toContain("from public, anon, authenticated");
    expect(securityDefinerHardening).toContain("to service_role");
    expect(securityDefinerHardening).toContain("set search_path = pg_catalog, public");
  });

  it("keeps transportation tables and mutual-acceptance RPCs service-only", () => {
    expect(transportation).toContain("alter table public.transportation_requests enable row level security");
    expect(transportation).toContain("alter table public.transportation_offers enable row level security");
    expect(transportation).toContain("alter table public.transportation_assignments enable row level security");
    expect(transportation).toContain("from public, anon, authenticated");
    expect(transportation).toContain("to service_role");
    expect(transportation).toContain("transportation_pickup_restriction_exists");
    expect(transportation).toContain("requester_accepted_at = now()");
    expect(transportation).toContain("idx_transportation_assignments_one_assigned");
    expect(transportation).toContain("where status = 'assigned'");
    expect(transportation).toContain("Another mutually accepted offer was selected.");
  });

  it("keeps migration-backed server tables available only to the service adapter role", () => {
    const serverOnlyGrants = dataApiServiceRoleGrants.split(
      "-- Server-adapter-only tables from migrations 0022-0024."
    )[1];
    expect(dataApiServiceRoleGrants).toContain(
      "grant select, insert, update, delete on table"
    );
    expect(dataApiServiceRoleGrants).toContain("to anon, authenticated, service_role");
    expect(dataApiServiceRoleGrants).not.toContain("grant all on table");
    expect(dataApiServiceRoleGrants).toContain("public.profiles");
    expect(dataApiServiceRoleGrants).toContain("public.support_requests");
    expect(serverOnlyGrants).toBeTruthy();
    expect(serverOnlyGrants).toContain("public.drill_videos");
    expect(serverOnlyGrants).toContain("public.offline_action_receipts");
    expect(serverOnlyGrants).toContain("public.practice_run_receipts");
    expect(serverOnlyGrants).toContain("public.game_day_resolution_reviews");
    expect(serverOnlyGrants).toContain("from public, anon, authenticated");
    expect(serverOnlyGrants).toContain("to service_role");
    expect(serverOnlyGrants).not.toContain("to authenticated");
    expect(serverOnlyGrants).not.toContain("to anon");
  });

  it("avoids PostgreSQL reserved words as transportation and caregiver aliases", () => {
    const caregiver = migration("0029_temporary_caregiver_authorizations.sql");
    expect(transportation).not.toContain("guardian_authorizations authorization");
    expect(caregiver).not.toContain("temporary_caregiver_authorizations authorization");
  });

  it("keeps relocatable extensions out of the exposed public schema", () => {
    expect(extensionHardening).toContain("create schema if not exists extensions");
    expect(extensionHardening).toContain("alter extension btree_gist set schema extensions");
  });

  it("keeps additional-guardian revocation executable and service-only", () => {
    expect(guardianRevocationFix).toContain("revocation_reason = trim($3)");
    expect(guardianRevocationFix).toContain(
      "revoke all on function public.revoke_additional_guardian_access(uuid, uuid, text)"
    );
    expect(guardianRevocationFix).toContain("from public, anon, authenticated");
    expect(guardianRevocationFix).toContain("to service_role");
  });

  it("removes broad RLS-helper execution while retaining required API policy evaluation", () => {
    expect(rlsHelperExecution).toContain(
      "revoke execute on function public.current_user_can_access_team(uuid) from public, anon"
    );
    expect(rlsHelperExecution).toContain(
      "grant execute on function public.current_user_can_access_team(uuid) to authenticated, service_role"
    );
    expect(rlsHelperExecution.match(/revoke execute on function/g)).toHaveLength(8);
    expect(rlsHelperExecution.match(/grant execute on function/g)).toHaveLength(8);
    expect(anonymousRlsPolicyEvaluation).toContain(
      "grant execute on function public.current_user_can_access_team(uuid) to anon"
    );
    expect(anonymousRlsPolicyEvaluation.match(/grant execute on function/g)).toHaveLength(8);
    expect(anonymousRlsPolicyEvaluation).not.toContain("to public");
  });
});
