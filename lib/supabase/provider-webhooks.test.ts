import { describe, expect, it } from "vitest";
import { providerWebhookAttemptEvidenceUpdate } from "./provider-webhooks";

const observedAt = "2026-07-27T22:40:00.000Z";

describe("provider webhook attempt evidence", () => {
  it("resolves an indeterminate Pingram request when delivery is verified", () => {
    expect(providerWebhookAttemptEvidenceUpdate({
      provider: "pingram",
      eventType: "SMS_DELIVERED",
      signatureVerifiedAt: observedAt
    }, {
      deliveredAt: null,
      providerAcceptedAt: null,
      requestOutcome: "indeterminate"
    })).toEqual({
      delivered_at: observedAt,
      status: "sent",
      reconciliation_required_at: null,
      request_outcome: "provider_accepted",
      provider_accepted_at: observedAt,
      error_code: null,
      error_message: null
    });
  });

  it("records downstream failure without denying proved provider acceptance", () => {
    expect(providerWebhookAttemptEvidenceUpdate({
      provider: "pingram",
      eventType: "SMS_FAILED",
      signatureVerifiedAt: observedAt
    }, {
      deliveredAt: null,
      providerAcceptedAt: null,
      requestOutcome: "indeterminate"
    })).toEqual({
      status: "failed",
      reconciliation_required_at: null,
      request_outcome: "provider_accepted",
      provider_accepted_at: observedAt,
      error_code: null,
      error_message: null
    });
  });

  it("does not overwrite prior delivery proof with a contradictory later failure", () => {
    expect(providerWebhookAttemptEvidenceUpdate({
      provider: "pingram",
      eventType: "SMS_FAILED",
      signatureVerifiedAt: observedAt
    }, {
      deliveredAt: "2026-07-27T22:39:00.000Z",
      providerAcceptedAt: "2026-07-27T22:38:00.000Z",
      requestOutcome: "provider_accepted"
    })).toEqual({
      reconciliation_required_at: null
    });
  });

  it("does not resolve reconciliation from non-terminal Pingram evidence", () => {
    expect(providerWebhookAttemptEvidenceUpdate({
      provider: "pingram",
      eventType: "SMS_INBOUND",
      signatureVerifiedAt: observedAt
    }, {
      deliveredAt: null,
      providerAcceptedAt: null,
      requestOutcome: "indeterminate"
    })).toEqual({});
  });
});
