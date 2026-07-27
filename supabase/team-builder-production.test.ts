import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationName = readdirSync(join(process.cwd(), "supabase", "migrations"))
  .find((name) => name.endsWith("_complete_private_team_builder_publish.sql"));
const migration = migrationName
  ? readFileSync(join(process.cwd(), "supabase", "migrations", migrationName), "utf8")
  : "";

describe("private team-builder production contract", () => {
  it("keeps private child inputs separate, RLS-enabled, and unavailable to browser roles", () => {
    expect(migrationName).toMatch(/^\d{14}_complete_private_team_builder_publish\.sql$/);
    expect(migration).toContain("create table public.player_team_builder_profiles");
    expect(migration).toContain("evaluation_rating smallint check (evaluation_rating between 1 and 5)");
    expect(migration).toContain("alter table public.player_team_builder_profiles enable row level security");
    expect(migration).toContain("revoke all on table public.player_team_builder_profiles from public, anon, authenticated");
    expect(migration).toContain("player_team_builder_profiles_player_tenant_fkey");
    expect(migration).not.toContain("alter table public.players\n  add column birth_date");
    expect(migration).not.toContain("evaluation_note");
  });

  it("publishes approved assignments atomically with version and idempotency evidence", () => {
    expect(migration).toContain("create or replace function public.publish_team_build_plan");
    expect(migration).toContain("for update");
    expect(migration).toContain("plan_row.lock_version <> expected_lock_version");
    expect(migration).toContain("plan_row.status <> 'approved'");
    expect(migration).toContain("plan_row.publish_action_id = target_action_id");
    expect(migration).toContain("get diagnostics updated_count = row_count");
    expect(migration).toContain("Atomic publish did not update the complete approved assignment set");
    expect(migration).toContain("'team_build_plan_published'");
    expect(migration).toContain("Provider execution: not started");
    expect(migration).toContain("revoke all on function public.publish_team_build_plan");
  });
});
