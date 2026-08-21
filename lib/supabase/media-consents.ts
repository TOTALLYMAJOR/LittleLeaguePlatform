import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // The consent writer RPC is introduced by a forward migration and leads the
  // generated database types until the next schema type refresh.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  rpc(
    functionName: string,
    parameters: Record<string, unknown>
  ): PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

export interface ParentMediaConsentState {
  playerId: string;
  granted: boolean;
}

export async function listParentMediaConsents(input: {
  parentUserId: string;
  playerIds: string[];
}): Promise<{
  ok: boolean;
  consents: ParentMediaConsentState[];
  message: string;
}> {
  const parentUserId = input.parentUserId.trim();
  const playerIds = [...new Set(input.playerIds.map((id) => id.trim()).filter(Boolean))];
  if (!parentUserId || !playerIds.length) {
    return { ok: false, consents: [], message: "Linked player consent is unavailable." };
  }

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const { data: guardianRows, error: guardianError } = await withSupabaseTimeout(db
      .from("player_guardians")
      .select("player_id,parent_user_id,status")
      .eq("parent_user_id", parentUserId)
      .eq("status", "active")
      .in("player_id", playerIds), 7000) as {
        data: Array<{ player_id: string; parent_user_id: string; status: string }> | null;
        error: unknown;
      };
    if (guardianError) return { ok: false, consents: [], message: "Linked player consent is unavailable." };

    const linkedPlayerIds = [...new Set((guardianRows ?? []).map((row) => row.player_id))];
    if (!linkedPlayerIds.length) {
      return { ok: true, consents: [], message: "No linked players are available for consent." };
    }
    const { data: consentRows, error: consentError } = await withSupabaseTimeout(db
      .from("player_media_consents")
      .select("player_id,guardian_user_id,scope,granted_at,revoked_at")
      .eq("guardian_user_id", parentUserId)
      .eq("scope", "team_family")
      .in("player_id", linkedPlayerIds), 7000) as {
        data: Array<{
          player_id: string;
          guardian_user_id: string;
          scope: string;
          granted_at: string | null;
          revoked_at: string | null;
        }> | null;
        error: unknown;
      };
    if (consentError) return { ok: false, consents: [], message: "Linked player consent is unavailable." };

    const grantedByPlayerId = new Map((consentRows ?? []).map((row) => [
      row.player_id,
      Boolean(row.granted_at) && !row.revoked_at
    ]));
    return {
      ok: true,
      consents: linkedPlayerIds.map((playerId) => ({
        playerId,
        granted: grantedByPlayerId.get(playerId) ?? false
      })),
      message: "Current guardian media consent loaded."
    };
  } catch {
    return { ok: false, consents: [], message: "Linked player consent is unavailable." };
  }
}

export async function recordParentMediaConsent(input: {
  playerId: string;
  parentUserId: string;
  granted: boolean;
}) {
  const playerId = input.playerId.trim();
  const parentUserId = input.parentUserId.trim();
  if (!playerId || !parentUserId || typeof input.granted !== "boolean") {
    return { ok: false, message: "Player, verified guardian, and consent decision are required." };
  }

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const { data, error } = await withSupabaseTimeout(db.rpc("record_parent_media_consent", {
      target_player_id: playerId,
      target_guardian_user_id: parentUserId,
      target_granted: input.granted,
      target_evidence: {
        source: "family_photos",
        actorAuthority: "verified_session",
        scope: "team_family"
      }
    }), 10000);
    if (error) {
      return { ok: false, message: "Media consent could not be changed for this linked player." };
    }
    return {
      ok: true,
      granted: input.granted,
      message: input.granted
        ? "Team-family media consent granted. Media still requires safety review and family release."
        : "Team-family media consent revoked. Family media reads will hide affected items.",
      result: data
    };
  } catch {
    return { ok: false, message: "Media consent could not be changed for this linked player." };
  }
}
