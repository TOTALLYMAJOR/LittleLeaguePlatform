import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { acceptParentInvite, previewParentInvite } from "./invite-acceptance";

describe("parent invite acceptance boundary", () => {
  it("rejects incomplete secrets before persistence", async () => {
    await expect(previewParentInvite("short")).resolves.toMatchObject({ ok: false, code: "invalid" });
    await expect(acceptParentInvite({ token: "short", userId: "parent-1" })).resolves.toMatchObject({ ok: false });
  });

  it("keeps acceptance service-only, identity-matched, scoped, and provider-free", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/0026_parent_invite_acceptance.sql"), "utf8");
    expect(sql).toContain("Signed-in email does not match this invitation.");
    expect(sql).toContain("Approved guardian scope is unavailable.");
    expect(sql).toContain("Invitation team is not in an active season.");
    expect(sql).toContain("No provider message was sent.");
    expect(sql).toContain("to service_role");
  });
});
