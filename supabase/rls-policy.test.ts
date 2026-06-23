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
});
