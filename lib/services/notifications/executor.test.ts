import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claimQueuedNotificationDeliveries: vi.fn(),
  recheckNotificationDeliveryAuthority: vi.fn(),
  recordNotificationDeliveryOutcome: vi.fn(),
  createConfiguredNotificationAdapters: vi.fn(),
  runNotificationSendWorker: vi.fn()
}));

vi.mock("@/lib/supabase/provider-delivery", () => ({
  claimQueuedNotificationDeliveries: mocks.claimQueuedNotificationDeliveries,
  recheckNotificationDeliveryAuthority: mocks.recheckNotificationDeliveryAuthority,
  recordNotificationDeliveryOutcome: mocks.recordNotificationDeliveryOutcome
}));

vi.mock("./adapters", () => ({
  createConfiguredNotificationAdapters: mocks.createConfiguredNotificationAdapters
}));

vi.mock("./worker", () => ({
  runNotificationSendWorker: mocks.runNotificationSendWorker
}));

import { executeApprovedNotificationBatch } from "./executor";

describe("notification executor claim binding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards the exact expected attempt id and fails closed when it cannot be claimed", async () => {
    const expectedAttemptId = "11111111-1111-4111-8111-111111111111";
    mocks.claimQueuedNotificationDeliveries.mockResolvedValue({
      ok: false,
      message: "Expected attempt unavailable.",
      attempts: []
    });

    const result = await executeApprovedNotificationBatch({
      workerId: "qa-worker",
      limit: 1,
      expectedAttemptId
    });

    expect(mocks.claimQueuedNotificationDeliveries).toHaveBeenCalledWith({
      workerId: "qa-worker",
      limit: 1,
      expectedAttemptId,
      env: undefined
    });
    expect(mocks.runNotificationSendWorker).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      attempted: 0,
      outcomes: []
    });
  });
});
