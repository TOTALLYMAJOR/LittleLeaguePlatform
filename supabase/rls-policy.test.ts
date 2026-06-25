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
  const packageJson = readFileSync(join(process.cwd(), "package.json"), "utf8");
  const rlsProof = readFileSync(join(process.cwd(), "scripts", "verify-rls-boundaries.mjs"), "utf8");

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
});
