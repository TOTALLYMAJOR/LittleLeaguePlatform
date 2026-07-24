import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("registration invitation issuance", () => {
  const adapter = readFileSync(join(process.cwd(), "lib/supabase/registration-approvals.ts"), "utf8");
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/0033_registration_invitation_issuance.sql"),
    "utf8"
  );

  it("creates the raw secret server-side and sends only its hash into the atomic approval RPC", () => {
    expect(adapter).toContain("randomBytes(32).toString(\"base64url\")");
    expect(adapter).toContain("createHash(\"sha256\")");
    expect(adapter).toContain("approve_registration_request_with_invitation");
    expect(adapter).toContain("/invite/accept#token=");
    expect(sql).toContain("approval_result := public.approve_registration_request");
    expect(sql).toContain("target_invite_token_hash !~ '^[0-9a-f]{64}$'");
  });

  it("keeps issuance service-only, attributed, shown once, and provider-free", () => {
    expect(sql).toContain("'invitation_issued'");
    expect(sql).toContain("registration_approval_actions_evidence_note_check");
    expect(sql).toContain("revoke all on function public.approve_registration_request(uuid, uuid, text)");
    expect(sql).toContain("revoke all on function public.reject_registration_request(uuid, uuid, text)");
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).toContain("to service_role");
    expect(sql).toContain("'registration_invitation_issued'");
    expect(sql).toContain("'provider_execution', 'not_started'");
    expect(adapter).toContain("no email, SMS, push, or chat message was sent");
    expect(adapter).not.toContain("sendEmail");
    expect(adapter).not.toContain("sendSms");
  });

  it("fails the whole approval if an invited adult cannot receive a prepared credential", () => {
    expect(sql).toContain("Approved invitation could not be prepared. No registration records were changed.");
    expect(sql).toContain("invite.status = 'pending'");
    expect(sql).toContain("invite.accepted_at is null");
    expect(adapter).toContain("outcome could not be confirmed. Refresh the queue before trying again.");
  });
});
