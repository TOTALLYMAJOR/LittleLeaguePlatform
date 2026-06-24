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
  const packageJson = readFileSync(join(process.cwd(), "package.json"), "utf8");
  const rlsProof = readFileSync(join(process.cwd(), "scripts", "verify-rls-boundaries.mjs"), "utf8");

  it("keeps parent, coach, and admin team boundaries explicit", () => {
    expect(core).toContain("create policy \"team members can read players\"");
    expect(core).toContain("create policy \"parents can upsert own rsvps\"");
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

  it("keeps the real-session RLS QA proof wired", () => {
    expect(packageJson).toContain("\"qa:rls-proof\": \"node scripts/verify-rls-boundaries.mjs\"");
    expect(rlsProof).toContain("signInWithPassword");
    expect(rlsProof).toContain("parent cannot update weather alerts");
    expect(rlsProof).toContain("anonymous cannot read private teams");
  });
});
