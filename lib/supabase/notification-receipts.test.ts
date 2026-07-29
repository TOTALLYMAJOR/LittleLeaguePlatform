import { describe, expect, it } from "vitest";
import { mapNotificationReceipt } from "./notification-receipts";

describe("notification receipt evidence", () => {
  it("keeps approval, provider acceptance, delivery, read, and acknowledgment separate", () => {
    const receipt = mapNotificationReceipt({
      id: "notification-1",
      organization_id: "org-1",
      team_id: "team-1",
      event_id: "event-1",
      recipient_user_id: "parent-1",
      title: "Field update",
      body: "Field moved to Diamond 2.",
      channel: "email",
      notification_type: "schedule_changed",
      status: "read",
      provider_approval_status: "approved",
      created_at: "2026-07-20T10:00:00.000Z",
      sent_at: "2026-07-20T10:01:00.000Z",
      read_at: "2026-07-20T10:04:00.000Z",
      notification_delivery_attempts: [{
        id: "attempt-1",
        provider: "email",
        transport_provider: "sendgrid",
        status: "sent",
        request_outcome: "provider_accepted",
        approved_at: "2026-07-20T10:00:30.000Z",
        provider_accepted_at: "2026-07-20T10:01:00.000Z",
        delivered_at: "2026-07-20T10:02:00.000Z",
        read_at: "2026-07-20T10:04:00.000Z",
        acknowledged_at: "2026-07-20T10:05:00.000Z",
        reconciliation_required_at: null,
        error_message: null,
        attempted_at: "2026-07-20T10:01:00.000Z"
      }]
    });

    expect(receipt.providerApprovalStatus).toBe("approved");
    expect(receipt.evidence.transportProvider).toBe("sendgrid");
    expect(receipt.evidence.requestOutcome).toBe("provider_accepted");
    expect(receipt.evidence.providerAcceptedAt).toBe("2026-07-20T10:01:00.000Z");
    expect(receipt.evidence.deliveredAt).toBe("2026-07-20T10:02:00.000Z");
    expect(receipt.evidence.readAt).toBe("2026-07-20T10:04:00.000Z");
    expect(receipt.evidence.acknowledgedAt).toBe("2026-07-20T10:05:00.000Z");
  });

  it("does not infer provider delivery when no attempt exists", () => {
    const receipt = mapNotificationReceipt({
      id: "notification-2",
      organization_id: "org-1",
      team_id: "team-1",
      event_id: null,
      recipient_user_id: "parent-1",
      title: "Draft",
      body: "Review only.",
      channel: "push",
      notification_type: "team_broadcast",
      status: "pending",
      provider_approval_status: "pending",
      created_at: "2026-07-20T10:00:00.000Z",
      sent_at: null,
      read_at: null,
      notification_delivery_attempts: []
    });

    expect(receipt.evidence.attemptStatus).toBe("not_requested");
    expect(receipt.evidence.deliveredAt).toBeUndefined();
  });

  it("projects an indeterminate provider request as reconciliation evidence", () => {
    const receipt = mapNotificationReceipt({
      id: "notification-3",
      organization_id: "org-1",
      team_id: "team-1",
      event_id: null,
      recipient_user_id: "parent-1",
      title: "Weather update",
      body: "Practice location changed.",
      channel: "sms",
      notification_type: "weather_alert",
      status: "pending",
      provider_approval_status: "approved",
      created_at: "2026-07-20T10:00:00.000Z",
      sent_at: null,
      read_at: null,
      notification_delivery_attempts: [{
        id: "attempt-3",
        provider: "sms",
        transport_provider: "pingram",
        status: "failed",
        request_outcome: "indeterminate",
        approved_at: "2026-07-20T10:00:30.000Z",
        provider_accepted_at: null,
        delivered_at: null,
        read_at: null,
        acknowledged_at: null,
        reconciliation_required_at: "2026-07-20T10:01:30.000Z",
        error_message: "The request timed out after submission.",
        attempted_at: "2026-07-20T10:01:00.000Z"
      }]
    });

    expect(receipt.evidence.transportProvider).toBe("pingram");
    expect(receipt.evidence.requestOutcome).toBe("indeterminate");
    expect(receipt.evidence.reconciliationRequiredAt).toBe("2026-07-20T10:01:30.000Z");
    expect(receipt.evidence.providerAcceptedAt).toBeUndefined();
    expect(receipt.evidence.deliveredAt).toBeUndefined();
  });
});
