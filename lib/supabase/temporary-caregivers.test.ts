import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveTemporaryCaregiverState } from "./temporary-caregivers";

describe("temporary caregiver authorization boundary", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/0029_temporary_caregiver_authorizations.sql"),
    "utf8"
  );
  const adapter = readFileSync(join(process.cwd(), "lib/supabase/temporary-caregivers.ts"), "utf8");

  const stateInput = {
    revoked_at: null as string | null,
    expires_at: "2026-08-10T00:00:00.000Z",
    invite_expires_at: "2026-08-02T00:00:00.000Z",
    caregiver_accepted_at: "2026-07-30T00:00:00.000Z",
    starts_at: "2026-08-05T00:00:00.000Z"
  };

  it("does not label accepted future scope active before its authorized start", () => {
    expect(deriveTemporaryCaregiverState(stateInput, "2026-08-01T00:00:00.000Z"))
      .toBe("accepted_upcoming");
    expect(deriveTemporaryCaregiverState(stateInput, "2026-08-06T00:00:00.000Z"))
      .toBe("active");
    expect(adapter).toContain("filter((view) => view.state === \"active\")");
    expect(adapter).not.toContain("view.state === \"active\" || view.state === \"accepted_upcoming\"");
  });

  it("expires an unaccepted invitation without expiring already accepted care early", () => {
    expect(deriveTemporaryCaregiverState({
      ...stateInput,
      caregiver_accepted_at: null
    }, "2026-08-03T00:00:00.000Z")).toBe("expired");
    expect(deriveTemporaryCaregiverState(stateInput, "2026-08-03T00:00:00.000Z"))
      .toBe("accepted_upcoming");
    expect(adapter).toContain("if (view.state !== \"awaiting_caregiver_acceptance\")");
    expect(adapter).toContain("return { ok: false, message: previewMessage(view.state) }");
  });

  it("makes revocation immediately authoritative", () => {
    expect(deriveTemporaryCaregiverState({
      ...stateInput,
      revoked_at: "2026-08-01T12:00:00.000Z"
    }, "2026-08-01T12:00:01.000Z")).toBe("revoked");
  });

  it("enforces one child, selected events, a fourteen-day maximum, and minimum actions", () => {
    expect(sql).toContain("cardinality(target_event_ids) < 1");
    expect(sql).toContain("cardinality(target_event_ids) > 10");
    expect(sql).toContain("target_expires_at > target_starts_at + interval '14 days'");
    expect(sql).toContain("event.team_id = scope_row.team_id");
    expect(sql).toContain("event.starts_at >= target_starts_at");
    expect(sql).toContain("allowed_actions @> array['view_selected_event_passports']");
    expect(sql).toContain("'pickup_selected_events'");
  });

  it("requires active guardian authority, exact-email acceptance, and pickup restriction review", () => {
    expect(sql).toContain("guardian.parent_user_id = authorizing_user_id");
    expect(sql).toContain("guardian.status = 'active'");
    expect(sql).toContain("accepting_email <> authorization_row.caregiver_email");
    expect(sql).toContain("transportation_pickup_restriction_exists");
    expect(sql).toContain("activated_at = greatest(now(), authorization_row.starts_at)");
  });

  it("keeps fixed prohibitions, service-only writes, audit attribution, and no provider sends", () => {
    for (const prohibition of [
      "medical_or_health_access",
      "custody_authority",
      "attendance_or_rsvp_changes",
      "official_schedule_changes",
      "team_communication_publishing",
      "roster_or_other_child_access",
      "onward_delegation"
    ]) {
      expect(sql).toContain(prohibition);
    }
    expect(sql).toContain("to service_role");
    expect(sql).toContain("temporary_caregiver_authorized");
    expect(sql).toContain("temporary_caregiver_accepted");
    expect(sql).toContain("temporary_caregiver_revoked");
    expect(sql).not.toContain("insert into public.player_guardians");
    expect(sql).not.toContain("insert into public.team_memberships");
    expect(adapter).toContain("randomBytes(32)");
    expect(adapter).toContain("createHash(\"sha256\")");
    expect(adapter).not.toContain("sendEmail");
    expect(adapter).not.toContain("sendSms");
    expect(adapter).not.toContain("message: error.message");
  });
});
