import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { featureGateDecision } from "@/lib/services/feature-gates";
import { requireActiveOrganizationAdmin, requireActiveTeamCoachOrOrgAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

const MEDIA_BUCKET = "leaguepilot-private-media";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type UnsafeSupabase = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  storage: ReturnType<typeof createSupabaseAdminClient>["storage"];
};

type DynamicResult<T> = { data: T | null; error: { message?: string } | null };

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

function run<T>(operation: PromiseLike<unknown>) {
  return withSupabaseTimeout(operation as PromiseLike<DynamicResult<T>>, 10000);
}

function extensionForMime(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function hasSupportedMagicBytes(buffer: Buffer) {
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buffer.subarray(0, 4).toString("ascii") === "RIFF"
    && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return jpeg || png || webp;
}

function scannerReady(env: Partial<NodeJS.ProcessEnv> = process.env) {
  return Boolean(
    env.MEDIA_SCAN_ADAPTER_READY === "true"
    && env.MEDIA_SCAN_ENDPOINT
    && env.MEDIA_SCAN_TOKEN
    && env.MEDIA_SCAN_PROVIDER
  );
}

async function scanMediaBuffer(input: {
  buffer: Buffer;
  sha256: string;
  mimeType: string;
  env?: Partial<NodeJS.ProcessEnv>;
}) {
  const env = input.env ?? process.env;
  if (!scannerReady(env)) return { ok: false, message: "Production media scanner is not configured and proven." };
  const response = await fetch(env.MEDIA_SCAN_ENDPOINT!, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.MEDIA_SCAN_TOKEN}`,
      "content-type": input.mimeType,
      "x-content-sha256": input.sha256
    },
    body: new Uint8Array(input.buffer)
  }).catch(() => null);
  if (!response?.ok) return { ok: false, message: "Media scanner did not return verified evidence." };
  const evidence = await response.json().catch(() => null) as {
    clean?: boolean;
    evidenceId?: string;
    engineVersion?: string;
  } | null;
  if (!evidence?.clean || !evidence.evidenceId) {
    return { ok: false, message: "Media remains quarantined because scan evidence did not mark it clean." };
  }
  return { ok: true, evidence };
}

async function loadMediaGate(db: UnsafeSupabase, organizationId: string) {
  const result = await run<{ media_uploads_enabled: boolean }>(db.from("organizations")
    .select("media_uploads_enabled")
    .eq("id", organizationId)
    .maybeSingle());
  const gate = featureGateDecision({
    feature: "media_uploads",
    organizationEnabled: result.data?.media_uploads_enabled
  });
  if (!scannerReady()) {
    return { ...gate, enabled: false, reason: "Media uploads remain disabled until a production scanner is configured and proven." };
  }
  return gate;
}

export async function initiatePrivateMediaUpload(input: {
  teamId: string;
  actorUserId: string;
  title: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}) {
  const title = input.title.trim();
  if (!title || title.length > 160 || !allowedMimeTypes.has(input.mimeType)
    || !Number.isInteger(input.sizeBytes) || input.sizeBytes < 1 || input.sizeBytes > MAX_UPLOAD_BYTES
    || !/^[a-f0-9]{64}$/i.test(input.sha256)) {
    return { ok: false, message: "Media title, type, size, or SHA-256 evidence is invalid." };
  }
  try {
    const db = dbClient();
    const access = await requireActiveTeamCoachOrOrgAdmin({
      db,
      teamId: input.teamId,
      userId: input.actorUserId,
      action: "initiate a private media upload"
    });
    if (!access.ok || !access.team) return { ok: false, message: access.message };
    const gate = await loadMediaGate(db, access.team.organization_id);
    if (!gate.enabled) return { ok: false, code: "feature_disabled", message: gate.reason };
    const objectPath = `${access.team.organization_id}/${input.teamId}/quarantine/${randomUUID()}.${extensionForMime(input.mimeType)}`;
    const media = await run<{ id: string }>(db.from("media_items").insert({
      organization_id: access.team.organization_id,
      team_id: input.teamId,
      title,
      media_type: "google_photos",
      url: `private://${MEDIA_BUCKET}/${objectPath}`,
      moderation_status: "pending",
      visibility: "team",
      private_object_path: objectPath,
      content_mime_type: input.mimeType,
      content_size_bytes: input.sizeBytes,
      content_sha256: input.sha256,
      processing_started_at: new Date().toISOString()
    }).select("id").single());
    if (media.error || !media.data) return { ok: false, message: "Quarantined media record could not be created." };
    const signed = await db.storage.from(MEDIA_BUCKET).createSignedUploadUrl(objectPath);
    if (signed.error || !signed.data) {
      return { ok: false, message: "Private upload token could not be created." };
    }
    return {
      ok: true,
      message: "Private quarantine upload authorized. The asset is not family visible.",
      mediaItemId: media.data.id,
      objectPath,
      signedUploadUrl: signed.data.signedUrl,
      uploadToken: signed.data.token
    };
  } catch {
    return { ok: false, message: "Private media upload could not reach storage records." };
  }
}

export async function completePrivateMediaUpload(input: {
  mediaItemId: string;
  actorUserId: string;
}) {
  try {
    const db = dbClient();
    const media = await run<{
      id: string;
      organization_id: string;
      team_id: string;
      private_object_path: string;
      content_sha256: string;
      content_size_bytes: number;
    }>(db.from("media_items")
      .select("id,organization_id,team_id,private_object_path,content_sha256,content_size_bytes")
      .eq("id", input.mediaItemId)
      .maybeSingle());
    if (media.error || !media.data?.private_object_path) return { ok: false, message: "Quarantined media record was not found." };
    const access = await requireActiveTeamCoachOrOrgAdmin({
      db,
      teamId: media.data.team_id,
      userId: input.actorUserId,
      action: "complete a private media upload"
    });
    if (!access.ok) return { ok: false, message: access.message };
    const gate = await loadMediaGate(db, media.data.organization_id);
    if (!gate.enabled) return { ok: false, code: "feature_disabled", message: gate.reason };
    const download = await db.storage.from(MEDIA_BUCKET).download(media.data.private_object_path);
    if (download.error || !download.data) return { ok: false, message: "Quarantined media object was not found." };
    const original = Buffer.from(await download.data.arrayBuffer());
    if (original.byteLength !== Number(media.data.content_size_bytes) || !hasSupportedMagicBytes(original)) {
      return { ok: false, message: "Media remains quarantined because file size or magic-byte evidence did not match." };
    }
    const originalHash = createHash("sha256").update(original).digest("hex");
    if (originalHash !== media.data.content_sha256.toLowerCase()) {
      return { ok: false, message: "Media remains quarantined because SHA-256 evidence did not match." };
    }
    let processed: Buffer;
    try {
      processed = await sharp(original)
        .rotate()
        .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 88, mozjpeg: true })
        .toBuffer();
    } catch {
      return { ok: false, message: "Media remains quarantined because image decoding failed." };
    }
    const processedHash = createHash("sha256").update(processed).digest("hex");
    const scan = await scanMediaBuffer({
      buffer: processed,
      sha256: processedHash,
      mimeType: "image/jpeg"
    });
    if (!scan.ok) return { ok: false, message: scan.message };
    const processedPath = media.data.private_object_path.replace(/\/quarantine\/[^/]+$/, `/processed/${media.data.id}.jpg`);
    const upload = await db.storage.from(MEDIA_BUCKET).upload(processedPath, processed, {
      contentType: "image/jpeg",
      upsert: false
    });
    if (upload.error) return { ok: false, message: "Processed media could not be stored." };
    await db.storage.from(MEDIA_BUCKET).remove([media.data.private_object_path]);
    const now = new Date().toISOString();
    const updated = await run(db.from("media_items").update({
      private_object_path: processedPath,
      url: `private://${MEDIA_BUCKET}/${processedPath}`,
      content_mime_type: "image/jpeg",
      content_size_bytes: processed.byteLength,
      content_sha256: processedHash,
      processing_completed_at: now,
      scan_completed_at: now,
      scan_provider: process.env.MEDIA_SCAN_PROVIDER,
      scan_evidence_json: scan.evidence,
      retention_delete_after: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    }).eq("id", media.data.id).select("id,moderation_status,scan_completed_at").single());
    if (updated.error || !updated.data) return { ok: false, message: "Media scan evidence could not be saved." };
    return {
      ok: true,
      message: "Media processed and scanned. Human review and consent are still required before family release.",
      mediaItem: updated.data
    };
  } catch {
    return { ok: false, message: "Private media completion could not reach storage records." };
  }
}

export async function approvePrivateMediaFamilyRelease(input: {
  mediaItemId: string;
  actorUserId: string;
  playerIds: string[];
  consentBasis: string;
}) {
  const consentBasis = input.consentBasis.trim();
  if (!input.playerIds.length || !consentBasis) {
    return { ok: false, message: "Family release requires affected players and consent basis." };
  }
  try {
    const db = dbClient();
    const media = await run<{
      id: string;
      organization_id: string;
      team_id: string;
      scan_completed_at: string | null;
    }>(db.from("media_items")
      .select("id,organization_id,team_id,scan_completed_at")
      .eq("id", input.mediaItemId)
      .maybeSingle());
    if (media.error || !media.data) return { ok: false, message: "Media record was not found." };
    const access = await requireActiveOrganizationAdmin({
      db,
      organizationId: media.data.organization_id,
      userId: input.actorUserId,
      action: "approve media for family release"
    });
    if (!access.ok) return { ok: false, message: access.message };
    if (!media.data.scan_completed_at) return { ok: false, message: "Media cannot be released before verified scan evidence." };
    const consents = await run<Array<{ player_id: string }>>(db.from("player_media_consents")
      .select("player_id")
      .in("player_id", input.playerIds)
      .eq("team_id", media.data.team_id)
      .eq("scope", "team_family")
      .not("granted_at", "is", null)
      .is("revoked_at", null));
    const consented = new Set((consents.data ?? []).map((row) => row.player_id));
    if (input.playerIds.some((playerId) => !consented.has(playerId))) {
      return { ok: false, message: "Family release is blocked because active team-family consent is incomplete." };
    }
    const now = new Date().toISOString();
    const result = await run(db.from("media_items").update({
      family_release_approved_at: now,
      family_release_approved_by_user_id: input.actorUserId,
      consent_basis: consentBasis
    }).eq("id", media.data.id).select("id,family_release_approved_at").single());
    if (result.error || !result.data) return { ok: false, message: "Media family-release evidence could not be saved." };
    await run(db.from("media_review_history").insert({
      media_item_id: media.data.id,
      reviewer_user_id: input.actorUserId,
      previous_values_json: { familyReleaseApproved: false },
      next_values_json: { familyReleaseApproved: true },
      reason: consentBasis,
      consent_evidence_json: { playerIds: input.playerIds }
    }));
    return { ok: true, message: "Family-release evidence approved. Moderation approval is still required.", mediaItem: result.data };
  } catch {
    return { ok: false, message: "Media family release could not reach team records." };
  }
}
