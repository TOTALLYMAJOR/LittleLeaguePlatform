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
  const sponsorProgramSpine = migration("20260819161500_sponsor_program_spine.sql");
  const sponsorFulfillmentEvidence = migration("20260819190000_sponsor_fulfillment_evidence.sql");
  const sponsorFulfillmentCapture = migration("20260819210000_sponsor_fulfillment_evidence_capture.sql");
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
  const rlsAuthInitplanOptimization = migration(
    "20260726182645_optimize_rls_auth_initplans.sql"
  );
  const pingramSmsTransportSafety = migration(
    "20260727223340_pingram_sms_transport_safety.sql"
  );
  const pingramSmsExecutionAuthority = migration(
    "20260727224549_pingram_sms_execution_authority.sql"
  );
  const eventChangeReceipts = migration(
    "20260819084447_event_change_receipts.sql"
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

  it("keeps event-change receipts guardian-scoped and SQL-authorized", () => {
    expect(eventChangeReceipts).toContain(
      "alter table public.event_change_receipts enable row level security"
    );
    expect(eventChangeReceipts).toContain(
      'create policy "parents read own linked event change receipts"'
    );
    expect(eventChangeReceipts).toContain(
      "parent_user_id = (select auth.uid())"
    );
    expect(eventChangeReceipts).toContain("guardian.status = 'active'");
    expect(eventChangeReceipts).toContain(
      "unique (event_change_log_id, parent_user_id)"
    );
    expect(eventChangeReceipts).toContain(
      "check (acknowledged_at is null or seen_at is not null)"
    );
    expect(eventChangeReceipts).toContain(
      "create or replace function public.acknowledge_event_change"
    );
    expect(eventChangeReceipts).toContain("security definer");
    expect(eventChangeReceipts).toContain("set search_path = public");
    expect(eventChangeReceipts).toContain(
      "(select auth.uid()) is distinct from p_parent_user_id"
    );
    expect(eventChangeReceipts).toContain(
      "on conflict (event_change_log_id, parent_user_id) do nothing"
    );
    expect(eventChangeReceipts).toContain(
      "revoke all on function public.acknowledge_event_change(uuid, uuid, text)"
    );
    expect(eventChangeReceipts).toContain("from public, anon, authenticated");
    expect(eventChangeReceipts).toContain("to authenticated, service_role");
    expect(eventChangeReceipts).toContain("'event_change_acknowledged'");
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

  it("keeps Pingram attempts service-owned and STOP evidence fail-closed", () => {
    expect(pingramSmsTransportSafety).toContain(
      "alter table public.sms_contact_suppressions enable row level security"
    );
    expect(pingramSmsTransportSafety).toContain(
      "users and organization admins read sms suppressions"
    );
    expect(pingramSmsTransportSafety).not.toContain("phone text");
    expect(pingramSmsExecutionAuthority).toContain(
      "revoke insert, update, delete"
    );
    expect(pingramSmsExecutionAuthority).toContain(
      "drop policy if exists \"team managers create delivery attempts\""
    );
    expect(pingramSmsExecutionAuthority).toContain(
      "review_notification_delivery_transaction"
    );
    expect(pingramSmsExecutionAuthority).toContain(
      "apply_pingram_sms_contact_state_transaction"
    );
    expect(pingramSmsExecutionAuthority).toContain(
      "on conflict (organization_id, user_id)"
    );
    expect(pingramSmsExecutionAuthority).toContain(
      "team_id in ("
    );
    expect(pingramSmsExecutionAuthority).toContain(
      "claim_provider_webhook_event"
    );
    expect(pingramSmsExecutionAuthority).toContain(
      "processing_lease_id"
    );
    expect(pingramSmsExecutionAuthority).toContain(
      "reconcile_pending_provider_webhook_evidence"
    );
    expect(pingramSmsExecutionAuthority).toContain(
      "from public, anon, authenticated"
    );
    expect(pingramSmsExecutionAuthority).toContain("to service_role");
  });

  it("keeps the real-session RLS QA proof wired", () => {
    expect(packageJson).toContain("\"qa:rls-proof\": \"node scripts/verify-rls-boundaries.mjs\"");
    expect(rlsProof).toContain("signInWithPassword");
    expect(rlsProof).toContain("parent cannot update weather alerts");
    expect(rlsProof).toContain("parent cannot RSVP for unlinked player");
    expect(rlsProof).toContain("parent cannot read cross-team players");
    expect(rlsProof).toContain("coach cannot update archived-season events");
    expect(rlsProof).toContain("anonymous cannot read private teams");
    expect(rlsProof).toContain("parent cannot acknowledge an out-of-scope event change");
    expect(rlsProof).toContain("out-of-scope event change created no receipt row");
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

  it("keeps the sponsor program spine organization-scoped and admin-read only", () => {
    expect(sponsorProgramSpine).toContain("create table if not exists public.sponsorship_agreements");
    expect(sponsorProgramSpine).toContain("create table if not exists public.sponsorship_invoices");
    expect(sponsorProgramSpine).toContain("create table if not exists public.sponsor_payment_ledger_entries");

    expect(sponsorProgramSpine).toContain("organization admins read sponsorship agreements");
    expect(sponsorProgramSpine).toContain("organization admins read sponsorship invoices");
    expect(sponsorProgramSpine).toContain("organization admins read sponsor payment ledger entries");

    expect(sponsorProgramSpine).toContain("alter table public.sponsorship_agreements enable row level security");
    expect(sponsorProgramSpine).toContain("alter table public.sponsorship_invoices enable row level security");
    expect(sponsorProgramSpine).toContain("alter table public.sponsor_payment_ledger_entries enable row level security");

    expect(sponsorProgramSpine).toContain("revoke all on table public.sponsorship_agreements from public, anon, authenticated");
    expect(sponsorProgramSpine).toContain("revoke all on table public.sponsorship_invoices from public, anon, authenticated");
    expect(sponsorProgramSpine).toContain("revoke all on table public.sponsor_payment_ledger_entries from public, anon, authenticated");
  });

  it("keeps the sponsor payment ledger append-only for every connection including service_role", () => {
    // RLS alone cannot enforce this: createSupabaseAdminClient connects as service_role, which
    // bypasses row level security. The raising trigger is what makes append-only real (ADR 0003).
    expect(sponsorProgramSpine).toContain("grant select, insert on table public.sponsor_payment_ledger_entries to service_role");
    expect(sponsorProgramSpine).not.toContain("grant select, insert, update, delete on table public.sponsor_payment_ledger_entries");
    expect(sponsorProgramSpine).toContain("function public.sponsor_payment_ledger_append_only()");
    expect(sponsorProgramSpine).toContain("before update or delete on public.sponsor_payment_ledger_entries");
    expect(sponsorProgramSpine).toContain("is append-only");
    expect(sponsorProgramSpine).toContain("using errcode = '42501'");
  });

  it("keeps sponsor payment replay guarded and stores no balance column", () => {
    expect(sponsorProgramSpine).toContain("unique (provider, provider_event_id)");
    expect(sponsorProgramSpine).toContain("check (provider in ('stripe', 'manual'))");
    for (const balanceColumn of ["paid_cents", "outstanding_cents", "refunded_cents", "disputed_cents", "balance_cents"]) {
      expect(sponsorProgramSpine).not.toContain(balanceColumn);
    }
  });

  it("keeps sponsor fulfillment requirements and evidence organization-scoped and admin-read only", () => {
    expect(sponsorFulfillmentEvidence).toContain("create table if not exists public.sponsor_fulfillment_requirements");
    expect(sponsorFulfillmentEvidence).toContain("create table if not exists public.sponsor_fulfillment_evidence");

    expect(sponsorFulfillmentEvidence).toContain("organization admins read sponsor fulfillment requirements");
    expect(sponsorFulfillmentEvidence).toContain("organization admins read sponsor fulfillment evidence");

    expect(sponsorFulfillmentEvidence).toContain("alter table public.sponsor_fulfillment_requirements enable row level security");
    expect(sponsorFulfillmentEvidence).toContain("alter table public.sponsor_fulfillment_evidence enable row level security");

    expect(sponsorFulfillmentEvidence).toContain("revoke all on table public.sponsor_fulfillment_requirements from public, anon, authenticated");
    expect(sponsorFulfillmentEvidence).toContain("revoke all on table public.sponsor_fulfillment_evidence from public, anon, authenticated");

    // The policy body, not only its name. Asserting the name alone would pass against
    // `using (true)`, which is exactly the mistake this test exists to prevent.
    expect(sponsorFulfillmentEvidence).toMatch(
      /organization admins read sponsor fulfillment requirements"[\s\S]*?using \(public\.current_user_is_org_admin\(organization_id\)\)/
    );
    expect(sponsorFulfillmentEvidence).toMatch(
      /organization admins read sponsor fulfillment evidence"[\s\S]*?using \(public\.current_user_is_org_admin\(organization_id\)\)/
    );
    expect(sponsorFulfillmentEvidence).not.toMatch(/using \(true\)/);
  });

  it("binds every fulfillment row to its parent's organization by composite key", () => {
    // An RLS policy that reads the row's own organization_id is only as trustworthy as the writer
    // that set it, and service_role bypasses RLS entirely. The composite foreign keys make a
    // cross-organization parent unrepresentable rather than merely detectable after the fact.
    expect(sponsorFulfillmentEvidence).toContain(
      "add constraint uq_sponsorship_agreements_id_organization unique (id, organization_id)"
    );
    expect(sponsorFulfillmentEvidence).toMatch(
      /foreign key \(agreement_id, organization_id\)\s+references public\.sponsorship_agreements\(id, organization_id\)/
    );
    expect(sponsorFulfillmentEvidence).toMatch(
      /foreign key \(requirement_id, organization_id\)\s+references public\.sponsor_fulfillment_requirements\(id, organization_id\)/
    );
    expect(sponsorFulfillmentEvidence).toContain("unique (id, organization_id)");
  });

  it("captures fulfillment evidence and its audit event in one transaction", () => {
    // Two independent inserts could leave an admin-sensitive write with no audit trail, and
    // evidence is append-only so it could not be withdrawn afterwards.
    expect(sponsorFulfillmentCapture).toContain("create or replace function public.record_sponsor_fulfillment_evidence(");
    expect(sponsorFulfillmentCapture).toMatch(
      /insert into public\.sponsor_fulfillment_evidence[\s\S]*insert into public\.audit_events/
    );
    expect(sponsorFulfillmentCapture).toContain("sponsor_fulfillment_evidence_captured");
  });

  it("makes a resubmitted observation a no-op rather than a second delivery", () => {
    // Delivered quantity is a count of evidence rows, so an unguarded retry could satisfy a
    // promised quantity the league never met. `nulls not distinct` is required because written
    // evidence has no artifact_url and pointer evidence has no note.
    expect(sponsorFulfillmentCapture).toContain(
      "unique nulls not distinct (requirement_id, kind, observed_at, artifact_url, note)"
    );
    expect(sponsorFulfillmentCapture).toContain(
      "on conflict on constraint uq_sponsor_fulfillment_evidence_observation do nothing"
    );
  });

  it("re-derives evidence capture authority in SQL and leaks no requirement existence", () => {
    expect(sponsorFulfillmentCapture).toMatch(
      /membership\.role = 'admin'[\s\S]*membership\.status = 'active'/
    );
    // A missing requirement and a forbidden one answer alike.
    expect(sponsorFulfillmentCapture).not.toContain("could not be found");
    expect(sponsorFulfillmentCapture).toContain("security definer");
    expect(sponsorFulfillmentCapture).toContain("set search_path = public");
    expect(sponsorFulfillmentCapture).toContain(
      "revoke all on function public.record_sponsor_fulfillment_evidence(uuid, uuid, text, timestamptz, text, text)"
    );
    expect(sponsorFulfillmentCapture).not.toMatch(/grant execute on function public\.record_sponsor_fulfillment_evidence[\s\S]*to (?:public|anon|authenticated)/);
  });

  it("keeps fulfillment evidence append-only against service_role and the table owner alike", () => {
    // Mirrors sponsor_payment_ledger_entries in the Phase 1 spine. A grant is additive, so
    // withholding update and delete does not withdraw the default privileges service_role already
    // holds; the revoke does that, and the trigger covers the table owner, which no grant restrains.
    expect(sponsorFulfillmentEvidence).toContain(
      "create or replace function public.sponsor_fulfillment_evidence_append_only()"
    );
    expect(sponsorFulfillmentEvidence).toMatch(
      /create trigger sponsor_fulfillment_evidence_append_only\s+before update or delete on public\.sponsor_fulfillment_evidence/
    );
    expect(sponsorFulfillmentEvidence).toContain(
      "revoke update, delete on table public.sponsor_fulfillment_evidence from service_role"
    );
    // Cascade cleanup stays possible: the delete branch permits removal once the parent is gone.
    expect(sponsorFulfillmentEvidence).toContain(
      "select 1 from public.sponsor_fulfillment_requirements where id = old.requirement_id"
    );
  });

  it("stores no deliverable state column, so delivered stays derivable only from evidence", () => {
    // The invariant this migration exists to make structurally true: with no state column, an
    // optimistic write has nowhere to record a delivery it cannot prove (ADR 0003).
    for (const stateColumn of [
      "delivery_state",
      "deliverable_state",
      "fulfillment_status",
      "delivered_at",
      "delivered_quantity",
      "is_delivered"
    ]) {
      expect(sponsorFulfillmentEvidence).not.toContain(stateColumn);
    }
    expect(sponsorFulfillmentEvidence).not.toMatch(/create table if not exists public\.sponsor_fulfillment_requirements[\s\S]*?\n\s+status text/);
    expect(sponsorFulfillmentEvidence).not.toMatch(/create table if not exists public\.sponsor_fulfillment_evidence[\s\S]*?\n\s+status text/);
  });

  it("rejects fulfillment evidence observed in the future for every connection", () => {
    expect(sponsorFulfillmentEvidence).toContain("function public.sponsor_fulfillment_evidence_not_future()");
    expect(sponsorFulfillmentEvidence).toContain("before insert or update on public.sponsor_fulfillment_evidence");
    expect(sponsorFulfillmentEvidence).toContain("cannot be observed in the future");
    // Evidence carries the delivery claim, so correcting one is a separately authorized action.
    expect(sponsorFulfillmentEvidence).toContain("grant select, insert on table public.sponsor_fulfillment_evidence to service_role");
    expect(sponsorFulfillmentEvidence).not.toContain("grant select, insert, update, delete on table public.sponsor_fulfillment_evidence");
  });

  it("adopts the existing sponsor package table instead of creating a second one", () => {
    expect(sponsorProgramSpine).toContain("alter table public.sponsor_packages");
    expect(sponsorProgramSpine).not.toContain("create table if not exists public.sponsorship_packages");
    expect(sponsorProgramSpine).toContain("sponsor_packages_benefits_is_array");
  });

  it("preserves the legacy sponsor billing link so in-flight Stripe sessions are not orphaned", () => {
    expect(sponsorProgramSpine).toContain("legacy_billing_record_id uuid references public.sponsor_billing_records(id)");
    expect(sponsorProgramSpine).toContain("uq_sponsorship_invoices_legacy_billing_record");
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

  it("caches request-constant user identity without changing RLS policy scope", () => {
    const executableSql = rlsAuthInitplanOptimization.replace(/--.*$/gm, "");
    const optimizedPolicies = Array.from(
      executableSql.matchAll(
        /^alter policy "([^"]+)"\s+on public\.([a-z_]+)/gm
      ),
      ([, policy, table]) => `${table}:${policy}`
    );

    expect(optimizedPolicies).toEqual([
      "coach_event_notes:team staff manage coach event notes",
      "drill_video_sources:coaches read reviewed drill video sources",
      "drill_videos:coaches read approved drill videos",
      "drill_videos:coaches submit drill videos for their organizations",
      "event_attendance:linked families and team staff read attendance",
      "family_event_handoffs:guardians create own family handoff plans",
      "family_event_handoffs:guardians read own family handoff plans",
      "family_event_handoffs:guardians update own family handoff plans",
      "family_obligations:guardians and admins read family obligations",
      "fee_definitions:organization admins manage fee definitions",
      "game_day_resolution_reviews:coaches and admins manage game day resolution reviews",
      "media_review_history:team staff create media review history",
      "mobile_usage_events:organization admins read mobile usage events",
      "mobile_usage_events:users create own mobile usage events",
      "notification_delivery_attempts:notification recipients and team managers read delivery attempt",
      "notification_preferences:users manage own notification preferences",
      "notifications:users can mark own notifications read",
      "notifications:users can read own notifications",
      "offline_action_receipts:actors create scoped offline action receipts",
      "offline_action_receipts:actors read own offline action receipts",
      "organization_memberships:members can read their org memberships",
      "organizations:organization members can read organizations",
      "parent_replay_engagement:parents read own replay engagement",
      "payment_evidence:guardians and admins read payment evidence",
      "player_media_consents:guardians and staff read media consent",
      "player_media_consents:guardians manage own media consent",
      "practice_run_receipts:coaches and admins manage practice run receipts",
      "profiles:profiles can insert own profile",
      "profiles:profiles can update own basic profile",
      "push_subscriptions:users manage own push subscriptions",
      "rsvp_change_logs:parents and staff read rsvp change logs",
      "rsvp_change_logs:parents insert own rsvp change logs",
      "rsvps:parents can upsert active linked child rsvps",
      "seasons:members can read seasons",
      "support_requests:parents and staff read support requests",
      "support_requests:parents create own support requests",
      "team_chat_attachments:team members create chat attachments",
      "team_chat_message_reads:users manage own chat reads",
      "team_chat_messages:authors can edit own visible chat messages",
      "team_chat_messages:team members can create chat messages",
      "team_chat_reactions:users manage own chat reactions",
      "team_chat_reports:team members create chat reports",
      "team_memberships:members can read team memberships",
      "volunteer_transfer_requests:requesters and staff update volunteer transfers",
      "volunteer_transfer_requests:users and team staff read volunteer transfers",
      "volunteer_transfer_requests:users request own volunteer transfers",
      "volunteer_waitlist_entries:users and team staff read volunteer waitlists",
      "volunteer_waitlist_entries:users join own volunteer waitlists",
      "volunteer_waitlist_entries:users withdraw own volunteer waitlists"
    ]);
    const declaredDeliveryAttemptPolicy =
      "notification recipients and team managers read delivery attempts";
    expect(Buffer.byteLength(declaredDeliveryAttemptPolicy, "utf8")).toBe(64);
    expect(
      Buffer.from(declaredDeliveryAttemptPolicy, "utf8")
        .subarray(0, 63)
        .toString("utf8")
    ).toBe(
      "notification recipients and team managers read delivery attempt"
    );
    expect(executableSql.match(/^alter policy /gm)).toHaveLength(49);
    expect(executableSql.match(/\(select auth\.uid\(\)\)/g)).toHaveLength(72);
    expect(executableSql).not.toMatch(/(?<!select )auth\.uid\(\)/);
    expect(executableSql).not.toMatch(/\b(?:create|drop)\s+policy\b/i);
    expect(executableSql).not.toMatch(
      /\bto\s+(?:public|anon|authenticated|service_role)\b/i
    );
    expect(executableSql).not.toMatch(/disable row level security/i);
  });
});
