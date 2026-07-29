import { describe, expect, it } from "vitest";
import { buildAdminObservabilityData, type ObservabilityRows } from "./admin-observability";

const emptyRows: ObservabilityRows = {
  audits: [],
  deliveryAttempts: [],
  providerWebhooks: [],
  publicRateLimitBuckets: [],
  mediaItems: [],
  chatReports: [],
  chatModerationEvents: []
};

describe("admin observability aggregation", () => {
  it("summarizes production-risk signals from existing rows", () => {
    const data = buildAdminObservabilityData({
      source: "supabase",
      now: "2026-07-16T12:00:00.000Z",
      env: { SENTRY_DSN: "configured" },
      rows: {
        audits: [
          {
            id: "audit-auth",
            action: "auth_login_failed",
            target_type: "session",
            target_id: "user-1",
            summary: "Login failed for parent@example.com",
            created_at: "2026-07-16T11:55:00.000Z"
          },
          {
            id: "audit-rls",
            action: "rls_denied",
            target_type: "players",
            target_id: "player-2",
            summary: "RLS denied cross-team player read",
            created_at: "2026-07-16T11:56:00.000Z"
          },
          {
            id: "audit-admin",
            action: "admin_registration_approved",
            target_type: "registration_request",
            target_id: "request-1",
            summary: "Admin approved registration",
            created_at: "2026-07-16T11:57:00.000Z"
          }
        ],
        deliveryAttempts: [
          {
            id: "attempt-1",
            notification_id: "notification-1",
            provider: "sendgrid",
            channel: "email",
            status: "failed",
            error_code: "429",
            error_message: "Provider retry required",
            attempted_at: "2026-07-16T11:58:00.000Z",
            retry_count: 2
          }
        ],
        providerWebhooks: [
          {
            id: "webhook-1",
            provider: "twilio",
            event_type: "undelivered",
            received_at: "2026-07-16T11:59:00.000Z"
          }
        ],
        publicRateLimitBuckets: [
          {
            bucket_key: "registration-requests:hash:window",
            route_key: "registration-requests",
            hit_count: 6,
            expires_at: "2026-07-16T12:01:00.000Z",
            updated_at: "2026-07-16T12:00:00.000Z"
          }
        ],
        mediaItems: [
          {
            id: "media-1",
            title: "Reported photo",
            moderation_status: "pending",
            report_count: 1,
            created_at: "2026-07-16T11:50:00.000Z"
          }
        ],
        chatReports: [
          {
            id: "chat-report-1",
            status: "open",
            reason: "Concern",
            created_at: "2026-07-16T11:49:00.000Z"
          }
        ],
        chatModerationEvents: [
          {
            id: "chat-audit-1",
            action: "message_hidden",
            reason: "Reviewed",
            created_at: "2026-07-16T11:48:00.000Z"
          }
        ]
      }
    });

    expect(data.source).toBe("supabase");
    expect(data.metrics.find((metric) => metric.id === "auth-failures")?.count).toBe(1);
    expect(data.metrics.find((metric) => metric.id === "rls-denials")?.count).toBe(1);
    expect(data.metrics.find((metric) => metric.id === "provider-retries")?.count).toBe(1);
    expect(data.metrics.find((metric) => metric.id === "webhook-failures")?.count).toBe(1);
    expect(data.metrics.find((metric) => metric.id === "public-intake-throttles")?.count).toBe(1);
    expect(data.metrics.find((metric) => metric.id === "admin-actions")?.count).toBe(1);
    expect(data.metrics.find((metric) => metric.id === "media-moderation")?.count).toBe(1);
    expect(data.metrics.find((metric) => metric.id === "chat-moderation")?.count).toBe(2);
    expect(data.hooks.find((hook) => hook.envKey === "SENTRY_DSN")?.status).toBe("configured");
    expect(data.events.map((event) => event.source)).toEqual(expect.arrayContaining(["Auth", "RLS", "Provider retry", "Webhook", "Public intake", "Media", "Team chat"]));
  });

  it("reports healthy zero-count objectives without external hooks configured", () => {
    const data = buildAdminObservabilityData({
      rows: emptyRows,
      source: "local_fallback",
      now: "2026-07-16T12:00:00.000Z",
      env: {}
    });

    expect(data.metrics.every((metric) => metric.count === 0)).toBe(true);
    expect(data.objectives.every((objective) => objective.status === "ok")).toBe(true);
    expect(data.hooks.every((hook) => hook.status === "missing")).toBe(true);
    expect(data.message).toContain("local observability fallback");
  });
});
