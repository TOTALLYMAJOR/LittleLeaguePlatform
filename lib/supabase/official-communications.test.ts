import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("official communication revision boundary", () => {
  const migration = readFileSync(
    join(process.cwd(), "supabase/migrations/0030_official_communication_revisions.sql"),
    "utf8"
  );
  const adapter = readFileSync(
    join(process.cwd(), "lib/supabase/official-communications.ts"),
    "utf8"
  );

  it("keeps published versions immutable and corrections additive", () => {
    expect(migration).toContain("official_communication_versions_immutable");
    expect(migration).toContain("Create a correction or withdrawal instead.");
    expect(migration).toContain("unique (thread_id, version_number)");
    expect(migration).toContain("thread_row.current_version_number <> expected_thread_version");
    expect(migration).toContain("next_version := thread_row.current_version_number + 1");
  });

  it("requires current event truth, assigned human publisher, and elevated critical review", () => {
    expect(migration).toContain("coalesce(event_row.schedule_version, 1) <> expected_schedule_version");
    expect(migration).toContain("Archived teams and seasons are read-only.");
    expect(migration).toContain("membership.role = 'admin'");
    expect(migration).toContain("membership.role = 'coach'");
    expect(migration).toContain("target_priority = 'critical' and not is_admin");
    expect(migration).toContain("target_category = 'critical_instruction' and target_priority <> 'critical'");
    expect(migration).toContain("event_change_logs");
    expect(migration).toContain("change_log.change_type in ('time_changed', 'location_changed', 'cancelled', 'restored')");
    expect(migration).toContain("change_log.actor_user_id is not null");
    expect(migration).toContain("Publish the attributed official schedule change");
  });

  it("projects one event version across required family surfaces without provider execution", () => {
    for (const surface of [
      "communication_room",
      "family_mission_control",
      "family_schedule",
      "event_passport"
    ]) {
      expect(migration).toContain(`'${surface}', true, 'ready'`);
    }
    expect(migration).toContain("'provider_delivery', false, 'pending'");
    expect(migration).toContain("'provider_execution', 'not_started'");
    expect(migration).toContain("'pending', 'pending', version_row.id");
    expect(adapter).not.toContain("sendEmail");
    expect(adapter).not.toContain("sendSms");
  });

  it("opens an incident for partial propagation and audits human attribution", () => {
    expect(migration).toContain("official_communication_incidents");
    expect(migration).toContain("projection.required");
    expect(migration).toContain("projection.status <> 'ready'");
    expect(migration).toContain("'official_communication_' || target_action");
    expect(migration).toContain("publishing_user_id");
  });

  it("binds acknowledgment to the current message version and requires delivery evidence", () => {
    expect(migration).toContain("thread_row.current_version_id is distinct from version_row.id");
    expect(migration).toContain("'code', 'superseded'");
    expect(migration).toContain("attempt_row.official_communication_version_id is distinct from version_row.id");
    expect(migration).toContain("'code', 'attempt_required'");
    expect(migration).toContain("'messageVersionNumber', version_row.version_number");
  });

  it("keeps all revision records service-only", () => {
    expect(migration).toContain("revoke all on table public.official_communication_threads from public, anon, authenticated");
    expect(migration).toContain("grant execute on function public.publish_official_communication_version");
    expect(migration).toContain("to service_role");
  });
});
