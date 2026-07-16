import { randomUUID } from "node:crypto";
import type { MediaItem } from "@/lib/domain";
import { requireActiveTeamMemberOrOrgAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Media upload storage uses staged columns until generated types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

interface DynamicQueryResult<T = unknown> {
  data: T | null;
  error: { message?: string } | null;
}

interface SignedUploadResult {
  data: {
    signedUrl: string;
    path: string;
    token: string;
  } | null;
  error: { message?: string } | null;
}

export interface MediaUploadStorageBucket {
  createSignedUploadUrl(path: string): PromiseLike<SignedUploadResult>;
}

interface MediaUploadRuntime {
  db?: UnsafeSupabase;
  storage?: MediaUploadStorageBucket;
  bucket?: string;
  now?: Date;
  uploadId?: string;
}

export interface MediaUploadIntentInput {
  teamId: string;
  actorUserId: string;
  title: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  visibility?: MediaItem["visibility"];
}

export interface FinalizeMediaUploadInput {
  mediaItemId: string;
  actorUserId: string;
  storagePath: string;
}

export interface MediaUploadFileValidation {
  ok: boolean;
  message: string;
  extension?: string;
  mediaType?: Extract<MediaItem["type"], "uploaded_image" | "uploaded_video">;
}

type MediaUploadRow = {
  id: string;
  organization_id: string;
  team_id: string;
  title: string;
  media_type: MediaItem["type"];
  url: string;
  moderation_status: MediaItem["moderationStatus"];
  visibility: MediaItem["visibility"] | null;
  report_count: number;
  uploaded_by_user_id: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  mime_type: string | null;
  byte_size: number | null;
  upload_status: MediaItem["uploadStatus"];
  scan_status: MediaItem["scanStatus"];
  uploaded_at: string | null;
  takedown_requested_at: string | null;
  takedown_reason: string | null;
  retention_policy: string | null;
  created_at: string;
};

const maxUploadBytes = 50 * 1024 * 1024;
const allowedMimeTypes: Record<string, { extension: string; mediaType: Extract<MediaItem["type"], "uploaded_image" | "uploaded_video"> }> = {
  "image/jpeg": { extension: "jpg", mediaType: "uploaded_image" },
  "image/png": { extension: "png", mediaType: "uploaded_image" },
  "image/webp": { extension: "webp", mediaType: "uploaded_image" },
  "video/mp4": { extension: "mp4", mediaType: "uploaded_video" }
};

function runDynamicQuery<T>(operation: PromiseLike<unknown>, milliseconds = 7000) {
  return withSupabaseTimeout(operation as PromiseLike<DynamicQueryResult<T>>, milliseconds);
}

function resolveRuntime(runtime?: MediaUploadRuntime) {
  const bucket = runtime?.bucket ?? getMediaUploadBucket();
  if (runtime?.db && runtime.storage) {
    return {
      db: runtime.db,
      storage: runtime.storage,
      bucket,
      now: runtime.now ?? new Date(),
      uploadId: runtime.uploadId ?? randomUUID()
    };
  }

  const supabase = createSupabaseAdminClient() as unknown as UnsafeSupabase & {
    storage: { from(bucket: string): MediaUploadStorageBucket };
  };

  return {
    db: supabase,
    storage: supabase.storage.from(bucket),
    bucket,
    now: runtime?.now ?? new Date(),
    uploadId: runtime?.uploadId ?? randomUUID()
  };
}

function cleanPathSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

function storageUrl(bucket: string, path: string) {
  return `supabase-storage://${bucket}/${path}`;
}

function mapMediaUploadRow(row: MediaUploadRow): MediaItem {
  return {
    id: row.id,
    teamId: row.team_id,
    title: row.title,
    type: row.media_type,
    url: row.url,
    moderationStatus: row.moderation_status,
    visibility: row.visibility ?? "team",
    reportCount: row.report_count ?? 0,
    uploadedByUserId: row.uploaded_by_user_id ?? undefined,
    storageBucket: row.storage_bucket ?? undefined,
    storagePath: row.storage_path ?? undefined,
    mimeType: row.mime_type ?? undefined,
    byteSize: row.byte_size ?? undefined,
    uploadStatus: row.upload_status ?? undefined,
    scanStatus: row.scan_status ?? undefined,
    uploadedAt: row.uploaded_at ?? undefined,
    takedownRequestedAt: row.takedown_requested_at ?? undefined,
    takedownReason: row.takedown_reason ?? undefined,
    retentionPolicy: row.retention_policy ?? undefined,
    createdAt: row.created_at
  };
}

export function getMediaUploadBucket(env: NodeJS.ProcessEnv = process.env) {
  return env.SUPABASE_MEDIA_UPLOAD_BUCKET || env.SUPABASE_MEDIA_BUCKET || "team-media";
}

export function validateMediaUploadFile(input: {
  fileName: string;
  mimeType: string;
  byteSize: number;
}): MediaUploadFileValidation {
  if (!input.fileName.trim()) return { ok: false, message: "Media upload requires a file name." };
  if (!Number.isFinite(input.byteSize) || input.byteSize <= 0) {
    return { ok: false, message: "Media upload requires a non-empty file." };
  }
  if (input.byteSize > maxUploadBytes) {
    return { ok: false, message: "Media upload must be 50 MB or smaller." };
  }

  const normalizedMimeType = input.mimeType.trim().toLowerCase();
  const allowed = allowedMimeTypes[normalizedMimeType];
  if (!allowed) {
    return { ok: false, message: "Media upload must be JPEG, PNG, WebP, or MP4." };
  }

  return {
    ok: true,
    message: "Media upload file type and size are allowed.",
    extension: allowed.extension,
    mediaType: allowed.mediaType
  };
}

export function buildMediaUploadStoragePath(input: {
  organizationId: string;
  teamId: string;
  uploadId: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  now: Date;
}) {
  const validation = validateMediaUploadFile(input);
  const extension = validation.extension ?? "bin";
  const datePrefix = input.now.toISOString().slice(0, 10);
  return [
    "organizations",
    cleanPathSegment(input.organizationId),
    "teams",
    cleanPathSegment(input.teamId),
    "media",
    datePrefix,
    `${cleanPathSegment(input.uploadId)}.${extension}`
  ].join("/");
}

export async function createMediaUploadIntent(input: MediaUploadIntentInput, runtime?: MediaUploadRuntime) {
  const title = input.title.trim();
  if (!input.teamId || !input.actorUserId || !title) {
    return { ok: false, message: "Media upload requires team, user, and title." };
  }

  if (input.visibility && !["team", "organization"].includes(input.visibility)) {
    return { ok: false, message: "Unsupported media visibility." };
  }

  const validation = validateMediaUploadFile(input);
  if (!validation.ok || !validation.mediaType) return { ok: false, message: validation.message };

  try {
    const { db, storage, bucket, now, uploadId } = resolveRuntime(runtime);
    const access = await requireActiveTeamMemberOrOrgAdmin({
      db,
      teamId: input.teamId,
      userId: input.actorUserId,
      action: "submit team media uploads"
    });
    if (!access.ok || !access.team) return { ok: false, message: access.message };

    const path = buildMediaUploadStoragePath({
      organizationId: access.team.organization_id,
      teamId: input.teamId,
      uploadId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      now
    });
    const signedUpload = await withSupabaseTimeout(storage.createSignedUploadUrl(path), 7000);
    if (signedUpload.error || !signedUpload.data?.signedUrl || !signedUpload.data.token) {
      return { ok: false, message: `Media upload storage is not available for bucket ${bucket}.` };
    }

    const { data, error } = await runDynamicQuery<MediaUploadRow>(db
      .from("media_items")
      .insert({
        organization_id: access.team.organization_id,
        team_id: input.teamId,
        title,
        media_type: validation.mediaType,
        url: storageUrl(bucket, path),
        moderation_status: "pending",
        visibility: input.visibility ?? "team",
        report_count: 0,
        uploaded_by_user_id: input.actorUserId,
        storage_bucket: bucket,
        storage_path: path,
        mime_type: input.mimeType.trim().toLowerCase(),
        byte_size: input.byteSize,
        upload_status: "intent_created",
        scan_status: "pending",
        retention_policy: "season_archive_window"
      })
      .select("id,organization_id,team_id,title,media_type,url,moderation_status,visibility,report_count,uploaded_by_user_id,storage_bucket,storage_path,mime_type,byte_size,upload_status,scan_status,uploaded_at,takedown_requested_at,takedown_reason,retention_policy,created_at")
      .single());

    if (error || !data) return { ok: false, message: "Media upload intent could not be saved." };

    await runDynamicQuery(db
      .from("audit_events")
      .insert({
        organization_id: access.team.organization_id,
        actor_user_id: input.actorUserId,
        action: "media_upload_intent_created",
        target_type: "media_item",
        target_id: data.id,
        summary: `${title} upload intent created; media remains pending moderation.`
      }));

    return {
      ok: true,
      message: "Media upload intent created. Upload the file, then finalize it for moderation review.",
      mediaItem: mapMediaUploadRow(data),
      upload: {
        bucket,
        path,
        signedUploadUrl: signedUpload.data.signedUrl,
        token: signedUpload.data.token,
        maxBytes: maxUploadBytes
      }
    };
  } catch {
    return { ok: false, message: "Media upload intent could not reach Supabase Storage." };
  }
}

export async function finalizeMediaUpload(input: FinalizeMediaUploadInput, runtime?: MediaUploadRuntime) {
  if (!input.mediaItemId || !input.actorUserId || !input.storagePath) {
    return { ok: false, message: "Media upload finalize requires media item, user, and storage path." };
  }

  try {
    const { db, now } = resolveRuntime(runtime);
    const { data: existing, error: existingError } = await runDynamicQuery<{
      id: string;
      organization_id: string;
      team_id: string;
      title: string;
      storage_path: string | null;
      upload_status: MediaItem["uploadStatus"];
    }>(db
      .from("media_items")
      .select("id,organization_id,team_id,title,storage_path,upload_status")
      .eq("id", input.mediaItemId)
      .single());

    if (existingError || !existing) return { ok: false, message: "Media upload row could not be found." };
    if (existing.storage_path !== input.storagePath) {
      return { ok: false, message: "Media upload finalize path does not match the saved intent." };
    }

    const access = await requireActiveTeamMemberOrOrgAdmin({
      db,
      teamId: existing.team_id,
      userId: input.actorUserId,
      action: "finalize team media uploads"
    });
    if (!access.ok) return { ok: false, message: access.message };

    const uploadedAt = now.toISOString();
    const { data, error } = await runDynamicQuery<MediaUploadRow>(db
      .from("media_items")
      .update({
        upload_status: "uploaded",
        scan_status: "not_configured",
        moderation_status: "pending",
        uploaded_at: uploadedAt
      })
      .eq("id", input.mediaItemId)
      .select("id,organization_id,team_id,title,media_type,url,moderation_status,visibility,report_count,uploaded_by_user_id,storage_bucket,storage_path,mime_type,byte_size,upload_status,scan_status,uploaded_at,takedown_requested_at,takedown_reason,retention_policy,created_at")
      .single());

    if (error || !data) return { ok: false, message: "Media upload could not be finalized." };

    await runDynamicQuery(db
      .from("audit_events")
      .insert({
        organization_id: existing.organization_id,
        actor_user_id: input.actorUserId,
        action: "media_upload_finalized",
        target_type: "media_item",
        target_id: existing.id,
        summary: `${existing.title} uploaded and queued for coach/admin moderation.`
      }));

    return {
      ok: true,
      message: "Media upload finalized and queued for moderation. It is not visible to families until approved.",
      mediaItem: mapMediaUploadRow(data)
    };
  } catch {
    return { ok: false, message: "Media upload finalize could not reach Supabase." };
  }
}
