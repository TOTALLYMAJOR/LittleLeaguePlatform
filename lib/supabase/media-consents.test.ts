import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "./admin";
import { recordParentMediaConsent } from "./media-consents";

vi.mock("./admin", () => ({ createSupabaseAdminClient: vi.fn() }));

const adminClientMock = vi.mocked(createSupabaseAdminClient);

describe("parent media consent authority", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attributes the atomic writer to the verified guardian identity", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { consent_id: "consent-1", granted: true },
      error: null
    });
    adminClientMock.mockReturnValue({ rpc } as never);

    const result = await recordParentMediaConsent({
      playerId: "player-1",
      parentUserId: "parent-1",
      granted: true
    });

    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("record_parent_media_consent", {
      target_player_id: "player-1",
      target_guardian_user_id: "parent-1",
      target_granted: true,
      target_evidence: {
        source: "family_photos",
        actorAuthority: "verified_session",
        scope: "team_family"
      }
    });
  });

  it("keeps guardian authorization, state change, and audit evidence in one service-only transaction", () => {
    const migration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260821041738_player_media_consent_writer.sql"),
      "utf8"
    );

    expect(migration).toContain("guardian.parent_user_id = target_guardian_user_id");
    expect(migration).toContain("guardian.status = 'active'");
    expect(migration).toContain("on conflict (player_id, guardian_user_id, scope)");
    expect(migration).toContain("insert into public.audit_events");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });
});
