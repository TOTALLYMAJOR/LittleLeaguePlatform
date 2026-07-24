import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("family Parent Replay privacy boundary", () => {
  const migration = readFileSync(
    join(process.cwd(), "supabase/migrations/0031_parent_replay_family_story.sql"),
    "utf8"
  );
  const adapter = readFileSync(join(process.cwd(), "lib/supabase/family-replays.ts"), "utf8");
  const scope = readFileSync(join(process.cwd(), "lib/supabase/route-scopes.ts"), "utf8");

  it("allows families to read published Replays only", () => {
    expect(adapter).toContain('.eq("status", "queued")');
    expect(adapter).toContain('.not("published_at", "is", null)');
    expect(scope).toContain('options.audience !== "parent" || replay.status === "queued"');
    expect(adapter).toContain('.eq("parent_user_id", input.parentUserId)');
    expect(adapter).toContain('.eq("status", "active")');
  });

  it("requires complete child subject identity and every current guardian consent", () => {
    expect(migration).toContain("Identify every child visible in this media.");
    expect(migration).toContain("Each identified child may appear only once.");
    expect(migration).toContain("Every identified child must belong to this Replay team.");
    expect(migration).toContain("Every identified child needs a current guardian");
    expect(migration).toContain("Current family media consent is required for every identified child.");
    expect(adapter).toContain("everySubjectHasGuardian");
    expect(adapter).toContain("everySubjectStillOnTeam");
    expect(adapter).toContain("everyGuardianConsented");
  });

  it("requires moderation, scan, family release, accessible copy, and admin review", () => {
    expect(migration).toContain("media_row.moderation_status <> 'approved'");
    expect(migration).toContain("media_row.family_release_approved_at is null");
    expect(migration).toContain("media_row.scan_completed_at is null");
    expect(migration).toContain("Accessible media description is required.");
    expect(migration).toContain("membership.role = 'admin'");
    expect(migration).toContain("parent_replay_family_media_published");
  });

  it("makes consent revocation effective at read time and keeps the media record reversible", () => {
    expect(adapter).toContain("!consent.revoked_at");
    expect(adapter).toContain("media.storage_deleted_at");
    expect(migration).toContain("revoke_parent_replay_family_media");
    expect(migration).toContain("parent_replay_family_media_revoked");
  });

  it("keeps household engagement private and never ranks children or invokes providers", () => {
    expect(migration).toContain("target_operation not in ('viewed', 'activity_completed', 'saved')");
    expect(migration).toContain("parents read own replay engagement");
    expect(migration).toContain('drop policy if exists "families and team staff read replay engagement"');
    expect(migration).toContain("This does not rank the child or family.");
    expect(adapter).not.toContain("sendEmail");
    expect(adapter).not.toContain("sendSms");
  });
});
