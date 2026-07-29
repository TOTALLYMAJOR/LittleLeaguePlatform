import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("additional guardian authority boundary", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/0027_additional_guardian_requests.sql"),
    "utf8"
  );
  const adapter = readFileSync(join(process.cwd(), "lib/supabase/additional-guardians.ts"), "utf8");

  it("keeps proposals child-scoped and unchanged until administrator review", () => {
    expect(sql).toContain("guardian.parent_user_id = proposing_user_id");
    expect(sql).toContain("guardian.status = 'active'");
    expect(sql).toContain("season.status = 'active'");
    expect(sql).toContain("Access remains unchanged pending administrator review.");
    expect(sql).toContain("standard_linked_guardian_access");
  });

  it("keeps approval service-only, attributed, one-time, and provider-free", () => {
    expect(sql).toContain("membership.role = 'admin'");
    expect(sql).toContain("membership.status = 'active'");
    expect(sql).toContain("target_invite_token_hash !~ '^[0-9a-f]{64}$'");
    expect(sql).toContain("No provider message was sent.");
    expect(sql).toContain("to service_role");
    expect(adapter).toContain("randomBytes(32)");
    expect(adapter).toContain("createHash(\"sha256\")");
    expect(adapter).not.toContain("sendEmail");
    expect(adapter).not.toContain("sendSms");
  });

  it("supports audited cancellation, rejection, acceptance, expiry, and revocation", () => {
    expect(sql).toContain("cancel_additional_guardian_request");
    expect(sql).toContain("reject_additional_guardian_request");
    expect(sql).toContain("revoke_additional_guardian_access");
    expect(sql).toContain("additional_guardian_access_revoked");
    expect(adapter).toContain("\"accepted\"");
    expect(adapter).toContain("\"expired\"");
  });

  it("fails closed when the staged table or scoped detail reads return an error", () => {
    expect(adapter).toContain("if (playersError || requestsError)");
    expect(adapter).toContain("if (requestsError) throw new Error");
    expect(adapter).toContain("Additional guardian review is temporarily unavailable.");
    expect(adapter).toContain("familySafeRpcMessages");
    expect(adapter).not.toContain("message: error.message");
  });
});
