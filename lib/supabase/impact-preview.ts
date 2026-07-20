import { createHmac, timingSafeEqual } from "node:crypto";
import { requireActiveOrganizationAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

type CountResult = {
  count: number | null;
  error: { message?: string } | null;
};

export interface SeasonArchiveImpactPreview {
  targetType: "season_archive";
  organizationId: string;
  seasonId: string;
  reason: string;
  counts: {
    teams: number;
    players: number;
    events: number;
  };
  affectedCount: number;
  consequences: string[];
  expiresAt: string;
  previewHash: string;
}

function previewSecret() {
  return process.env.IMPACT_PREVIEW_SECRET?.trim() ?? "";
}

function signPreview(input: Omit<SeasonArchiveImpactPreview, "previewHash">) {
  const secret = previewSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(JSON.stringify(input)).digest("hex");
}

async function countRows(db: UnsafeSupabase, table: string, seasonId: string) {
  const result = await withSupabaseTimeout(
    db.from(table).select("id", { count: "exact", head: true }).eq("season_id", seasonId),
    7000,
  ) as CountResult;
  if (result.error) throw new Error(result.error.message ?? `Could not count ${table}.`);
  return result.count ?? 0;
}

async function buildPreview(input: {
  db: UnsafeSupabase;
  organizationId: string;
  seasonId: string;
  reason: string;
  expiresAt: string;
}) {
  const seasonResult = await withSupabaseTimeout(input.db
    .from("seasons")
    .select("id,name,status,organization_id")
    .eq("id", input.seasonId)
    .eq("organization_id", input.organizationId)
    .single(), 7000) as {
      data: { id: string; name: string; status: "active" | "archived"; organization_id: string } | null;
      error: { message?: string } | null;
    };
  if (seasonResult.error || !seasonResult.data) {
    return { ok: false as const, message: "Archive preview requires a season in the active organization." };
  }

  const [teams, players, events] = await Promise.all([
    countRows(input.db, "teams", input.seasonId),
    countRows(input.db, "players", input.seasonId),
    countRows(input.db, "events", input.seasonId),
  ]);
  const unsigned: Omit<SeasonArchiveImpactPreview, "previewHash"> = {
    targetType: "season_archive",
    organizationId: input.organizationId,
    seasonId: input.seasonId,
    reason: input.reason,
    counts: { teams, players, events },
    affectedCount: teams + players + events,
    consequences: [
      "The season and its role-scoped surfaces become read-only.",
      "Existing records are retained; this action does not delete chat, media, or payment evidence.",
      "Exports and retention/deletion work remain separate administrator actions.",
    ],
    expiresAt: input.expiresAt,
  };
  return {
    ok: true as const,
    preview: { ...unsigned, previewHash: signPreview(unsigned) },
  };
}

export async function createSeasonArchiveImpactPreview(input: {
  organizationId: string;
  seasonId: string;
  actorUserId: string;
  reason: string;
}) {
  const reason = input.reason.trim();
  if (!input.organizationId || !input.seasonId || !input.actorUserId || reason.length < 8) {
    return { ok: false as const, message: "Archive preview requires a season and a reason of at least 8 characters." };
  }
  if (!previewSecret()) {
    return { ok: false as const, message: "High-impact previews are disabled until the server preview secret is configured." };
  }

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const access = await requireActiveOrganizationAdmin({
      db,
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "preview season archive impact",
    });
    if (!access.ok) return { ok: false as const, message: access.message };
    return buildPreview({
      db,
      organizationId: input.organizationId,
      seasonId: input.seasonId,
      reason,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
  } catch {
    return { ok: false as const, message: "Archive impact could not be computed from current records." };
  }
}

export async function verifySeasonArchiveImpactPreview(input: {
  organizationId: string;
  seasonId: string;
  actorUserId: string;
  reason: string;
  previewHash: string;
  previewExpiresAt: string;
}) {
  const expiresAt = Date.parse(input.previewExpiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || expiresAt > Date.now() + 10 * 60 * 1000) {
    return { ok: false as const, message: "Archive impact preview expired. Refresh it before confirming." };
  }
  const current = await createSeasonArchiveImpactPreview({
    organizationId: input.organizationId,
    seasonId: input.seasonId,
    actorUserId: input.actorUserId,
    reason: input.reason,
  });
  if (!current.ok) return current;

  const recomputed = await (async () => {
    try {
      const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
      return buildPreview({
        db,
        organizationId: input.organizationId,
        seasonId: input.seasonId,
        reason: input.reason.trim(),
        expiresAt: input.previewExpiresAt,
      });
    } catch {
      return { ok: false as const, message: "Archive impact could not be recomputed." };
    }
  })();
  if (!recomputed.ok || !recomputed.preview.previewHash || !input.previewHash) {
    return { ok: false as const, message: "Archive impact preview is not valid." };
  }

  const supplied = Buffer.from(input.previewHash, "hex");
  const expected = Buffer.from(recomputed.preview.previewHash, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return { ok: false as const, message: "Archive impact changed. Refresh the preview before confirming." };
  }
  return recomputed;
}
