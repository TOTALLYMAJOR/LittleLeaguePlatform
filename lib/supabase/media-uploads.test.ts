import { describe, expect, it } from "vitest";
import {
  buildMediaUploadStoragePath,
  createMediaUploadIntent,
  finalizeMediaUpload,
  validateMediaUploadFile,
  type MediaUploadStorageBucket
} from "./media-uploads";

function mediaUploadDb() {
  const inserts: Array<{ table: string; value: unknown }> = [];
  const updates: Array<{ table: string; value: unknown }> = [];
  const intentRow = {
    id: "media-upload-1",
    organization_id: "org-1",
    team_id: "team-1",
    title: "Opening day",
    media_type: "uploaded_image",
    url: "supabase-storage://team-media/organizations/org-1/teams/team-1/media/2026-07-16/upload-1.jpg",
    moderation_status: "pending",
    visibility: "team",
    report_count: 0,
    uploaded_by_user_id: "user-parent-1",
    storage_bucket: "team-media",
    storage_path: "organizations/org-1/teams/team-1/media/2026-07-16/upload-1.jpg",
    mime_type: "image/jpeg",
    byte_size: 1024,
    upload_status: "intent_created",
    scan_status: "pending",
    uploaded_at: null,
    takedown_requested_at: null,
    takedown_reason: null,
    retention_policy: "season_archive_window",
    created_at: "2026-07-16T12:00:00.000Z"
  };
  const finalizedRow = {
    ...intentRow,
    upload_status: "uploaded",
    scan_status: "not_configured",
    uploaded_at: "2026-07-16T12:05:00.000Z"
  };

  return {
    inserts,
    updates,
    db: {
      from(table: string) {
        const builder = {
          operation: "select",
          select() { return this; },
          eq() { return this; },
          single() { return this; },
          insert(value: unknown) {
            this.operation = "insert";
            inserts.push({ table, value });
            return this;
          },
          update(value: unknown) {
            this.operation = "update";
            updates.push({ table, value });
            return this;
          },
          then(resolve: (value: { data: unknown; error: null }) => unknown, reject?: (reason?: unknown) => unknown) {
            let data: unknown = null;
            if (table === "teams") data = { id: "team-1", organization_id: "org-1", season_id: "season-1", name: "Tiny Tigers" };
            if (table === "team_memberships") data = [{ id: "membership-1" }];
            if (table === "organization_memberships") data = [];
            if (table === "media_items" && this.operation === "insert") data = intentRow;
            if (table === "media_items" && this.operation === "select") {
              data = {
                id: "media-upload-1",
                organization_id: "org-1",
                team_id: "team-1",
                title: "Opening day",
                storage_path: intentRow.storage_path,
                upload_status: "intent_created"
              };
            }
            if (table === "media_items" && this.operation === "update") data = finalizedRow;
            return Promise.resolve({ data, error: null }).then(resolve, reject);
          }
        };
        return builder;
      }
    }
  };
}

const storage: MediaUploadStorageBucket = {
  createSignedUploadUrl(path) {
    return Promise.resolve({
      data: {
        signedUrl: `https://storage.example/${path}`,
        path,
        token: "signed-token"
      },
      error: null
    });
  }
};

describe("media upload storage pipeline", () => {
  it("validates upload type and size before storage intent creation", () => {
    expect(validateMediaUploadFile({ fileName: "photo.jpg", mimeType: "image/jpeg", byteSize: 1024 })).toMatchObject({
      ok: true,
      mediaType: "uploaded_image",
      extension: "jpg"
    });
    expect(validateMediaUploadFile({ fileName: "clip.mov", mimeType: "video/quicktime", byteSize: 1024 }).ok).toBe(false);
    expect(validateMediaUploadFile({ fileName: "photo.jpg", mimeType: "image/jpeg", byteSize: 51 * 1024 * 1024 }).ok).toBe(false);
  });

  it("builds tenant-scoped object paths without trusting file names", () => {
    const path = buildMediaUploadStoragePath({
      organizationId: "org/../1",
      teamId: "team-1",
      uploadId: "upload-1",
      fileName: "../../child-photo.jpg",
      mimeType: "image/jpeg",
      byteSize: 1024,
      now: new Date("2026-07-16T12:00:00.000Z")
    });

    expect(path).toBe("organizations/org-1/teams/team-1/media/2026-07-16/upload-1.jpg");
  });

  it("creates signed upload intents with pending moderation metadata", async () => {
    const { db, inserts } = mediaUploadDb();
    const result = await createMediaUploadIntent({
      teamId: "team-1",
      actorUserId: "user-parent-1",
      title: "Opening day",
      fileName: "photo.jpg",
      mimeType: "image/jpeg",
      byteSize: 1024,
      visibility: "team"
    }, {
      db,
      storage,
      bucket: "team-media",
      uploadId: "upload-1",
      now: new Date("2026-07-16T12:00:00.000Z")
    });

    expect(result.ok).toBe(true);
    expect(result.upload?.path).toBe("organizations/org-1/teams/team-1/media/2026-07-16/upload-1.jpg");
    expect(result.mediaItem?.moderationStatus).toBe("pending");
    expect(result.mediaItem?.uploadStatus).toBe("intent_created");
    expect(inserts.find((entry) => entry.table === "media_items")?.value).toMatchObject({
      organization_id: "org-1",
      team_id: "team-1",
      media_type: "uploaded_image",
      moderation_status: "pending",
      uploaded_by_user_id: "user-parent-1",
      storage_bucket: "team-media",
      storage_path: "organizations/org-1/teams/team-1/media/2026-07-16/upload-1.jpg",
      upload_status: "intent_created",
      scan_status: "pending"
    });
  });

  it("finalizes uploaded objects while keeping family visibility pending approval", async () => {
    const { db, updates } = mediaUploadDb();
    const result = await finalizeMediaUpload({
      mediaItemId: "media-upload-1",
      actorUserId: "user-parent-1",
      storagePath: "organizations/org-1/teams/team-1/media/2026-07-16/upload-1.jpg"
    }, {
      db,
      storage,
      bucket: "team-media",
      now: new Date("2026-07-16T12:05:00.000Z")
    });

    expect(result.ok).toBe(true);
    expect(result.mediaItem?.uploadStatus).toBe("uploaded");
    expect(result.mediaItem?.scanStatus).toBe("not_configured");
    expect(result.mediaItem?.moderationStatus).toBe("pending");
    expect(updates.find((entry) => entry.table === "media_items")?.value).toMatchObject({
      upload_status: "uploaded",
      scan_status: "not_configured",
      moderation_status: "pending",
      uploaded_at: "2026-07-16T12:05:00.000Z"
    });
  });
});
