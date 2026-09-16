import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "./admin";
import { acceptParentInvite, previewParentInvite } from "./invite-acceptance";

vi.mock("./admin", () => ({ createSupabaseAdminClient: vi.fn() }));

const createSupabaseAdminClientMock = vi.mocked(createSupabaseAdminClient);

describe("parent invite acceptance boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects incomplete secrets before persistence", async () => {
    await expect(previewParentInvite("short")).resolves.toMatchObject({ ok: false, code: "invalid" });
    await expect(acceptParentInvite({
      token: "short",
      userId: "parent-1",
      fullName: "Jordan Parent",
      phone: "+13125551234",
      smsOptIn: false
    })).resolves.toMatchObject({ ok: false });
  });

  it("rejects missing adult details before touching Supabase", async () => {
    await expect(acceptParentInvite({
      token: "a".repeat(32),
      userId: "parent-1",
      fullName: " ",
      phone: "+13125551234",
      smsOptIn: false
    })).resolves.toEqual({ ok: false, message: "Enter your full name." });

    await expect(acceptParentInvite({
      token: "a".repeat(32),
      userId: "parent-1",
      fullName: "Jordan Parent",
      phone: "312-555-1234",
      smsOptIn: false
    })).resolves.toEqual({ ok: false, message: "Enter a mobile number with country code, such as +13125551234." });

    expect(createSupabaseAdminClientMock).not.toHaveBeenCalled();
  });

  it("normalizes parent details and records the explicit SMS choice through the service-only RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { invite_id: "invite-1", sms_opted_in: true }, error: null });
    createSupabaseAdminClientMock.mockReturnValue({ rpc } as unknown as ReturnType<typeof createSupabaseAdminClient>);

    await expect(acceptParentInvite({
      token: "a".repeat(32),
      userId: "parent-1",
      fullName: "  Jordan Parent  ",
      phone: "+1 (312) 555-1234",
      smsOptIn: true
    })).resolves.toMatchObject({ ok: true });

    expect(rpc).toHaveBeenCalledWith("accept_parent_invite_with_contact", {
      target_invite_token_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      accepting_user_id: "parent-1",
      parent_display_name: "Jordan Parent",
      parent_mobile_phone: "+13125551234",
      record_sms_consent: true,
      consent_version: "parent-invite-essential-updates-v1"
    });
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
