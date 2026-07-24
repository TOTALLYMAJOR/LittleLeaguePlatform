import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { completeFamilyFirstSignIn } from "./family-onboarding";

describe("family first-sign-in authority boundary", () => {
  it("rejects incomplete preference input before persistence", async () => {
    const result = await completeFamilyFirstSignIn({
      userId: "",
      language: "en",
      criticalChannel: "email",
      routineChannel: "email",
      quietHoursStart: "21:00",
      quietHoursEnd: "07:00",
      timezone: "America/Chicago",
      translationEnabled: false,
      sharedDevicePreviews: false
    });
    expect(result.ok).toBe(false);
  });

  it("keeps the atomic RPC service-only and provider-free", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/0025_family_first_sign_in.sql"), "utf8");
    expect(sql).toContain("Active parent team access is required.");
    expect(sql).toContain("family_first_sign_in_completed");
    expect(sql).toContain("No provider message was sent.");
    expect(sql).toContain("revoke all on function public.complete_family_first_sign_in");
    expect(sql).toContain("to service_role");
    expect(sql).not.toContain("http");
  });
});
