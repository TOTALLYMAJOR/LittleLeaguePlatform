import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("season transition authority boundary", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/0032_season_transition_reviews.sql"),
    "utf8"
  );
  const adapter = readFileSync(join(process.cwd(), "lib/supabase/season-transitions.ts"), "utf8");
  const applyFunction = sql.slice(
    sql.indexOf("create or replace function public.apply_season_transition"),
    sql.indexOf("create or replace function public.close_season_transition")
  );
  const respondFunction = sql.slice(
    sql.indexOf("create or replace function public.respond_to_season_transition"),
    sql.indexOf("create or replace function public.apply_season_transition")
  );

  it("requires current-guardian review and administrator application without provider execution", () => {
    expect(sql).toContain("Every current guardian must accept the current review before application.");
    expect(sql).toContain("Current guardian access changed. Start a new review");
    expect(sql).toContain("membership.role = 'admin'");
    expect(sql).toContain("'provider_execution', 'not_started'");
    expect(adapter).not.toContain("sendEmail");
    expect(adapter).not.toContain("sendSms");
  });

  it("fixes the carry-forward and reset scope instead of accepting caller-selected fields", () => {
    expect(sql).toContain("array['child_display_identity', 'guardian_relationship']");
    expect(sql).toContain("'custody_restrictions', 'medical_information'");
    expect(sql).toContain("'transportation_responsibility', 'temporary_caregivers'");
    expect(sql).toContain("'media_consent', 'notification_preferences', 'team_conversation'");
    expect(sql).not.toContain("target_carry_forward_fields");
  });

  it("creates a provenance-linked child record without copying sensitive or operational rows", () => {
    expect(sql).toContain("source_season_transition_review_id");
    expect(sql).toContain("source_player.first_name, source_player.last_initial, null");
    expect(applyFunction).toContain("set roster_status = 'archived'");
    expect(respondFunction).not.toContain("set roster_status");
    expect(sql).toContain("set roster_status = transition_row.source_roster_status");
    expect(sql).toContain("idx_players_one_transition_target");
    expect(sql).not.toContain("insert into public.player_health_notes");
    expect(sql).not.toContain("insert into public.guardian_authorizations");
    expect(sql).not.toContain("insert into public.rsvps");
  });

  it("permits deletion only before all known downstream family activity", () => {
    for (const table of [
      "parent_invites",
      "player_guardians",
      "rsvps",
      "guardian_authorizations",
      "emergency_contacts",
      "player_health_notes",
      "learning_plans",
      "rsvp_change_logs",
      "event_attendance",
      "player_media_consents",
      "family_obligations",
      "family_event_handoffs",
      "additional_guardian_requests",
      "transportation_requests",
      "transportation_assignments",
      "temporary_caregiver_authorizations",
      "parent_replay_family_media"
    ]) {
      expect(sql).toContain(`public.${table}`);
    }
    expect(sql).toContain("needs a new reviewed correction instead of deletion");
  });

  it("keeps tables and functions service-only with lock and audit history", () => {
    expect(sql).toContain("revoke all on table public.season_transition_reviews from public, anon, authenticated");
    expect(sql).toContain("to service_role");
    expect(sql).toContain("expected_lock_version");
    expect(sql).toContain("insert into public.audit_events");
    expect(sql).toContain("close_season_transition");
    expect(sql).toContain("'season_transition_' || closed_state");
  });
});
