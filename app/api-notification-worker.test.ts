import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeApprovedNotificationBatch: vi.fn(),
  createSupabaseAdminClient: vi.fn()
}));

vi.mock("@/lib/services/notifications/executor", () => ({
  executeApprovedNotificationBatch: mocks.executeApprovedNotificationBatch
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient
}));

import { GET, POST } from "@/app/api/internal/notification-worker/route";

const workerToken = "leaguepilot-worker-token";
const expectedAttemptId = "11111111-1111-4111-8111-111111111111";

function request(body: Record<string, unknown>, token = workerToken) {
  return new Request("http://localhost/api/internal/notification-worker", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-LeaguePilot-Worker-Token": token
    },
    body: JSON.stringify(body)
  });
}

describe("notification worker route", () => {
  beforeEach(() => {
    vi.stubEnv("NOTIFICATION_WORKER_TOKEN", workerToken);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://preview-project.supabase.co");
    mocks.executeApprovedNotificationBatch.mockReset();
    mocks.executeApprovedNotificationBatch.mockResolvedValue({
      ok: true,
      attempted: 1,
      sent: 1,
      failed: 0,
      indeterminate: 0,
      deadLettered: 0,
      outcomes: []
    });
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      maybeSingle: vi.fn(async () => ({
        data: {
          id: expectedAttemptId,
          provider_sends_enabled: false
        },
        error: null
      }))
    };
    mocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn(() => builder)
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a request without the exact worker token", async () => {
    const response = await POST(request({
      workerId: "qa-worker",
      limit: 1,
      expectedAttemptId
    }, "wrong-token"));

    expect(response.status).toBe(401);
    expect(mocks.executeApprovedNotificationBatch).not.toHaveBeenCalled();
  });

  it("requires a valid expected attempt id", async () => {
    const response = await POST(request({
      workerId: "qa-worker",
      limit: 1,
      expectedAttemptId: "not-a-uuid"
    }));

    expect(response.status).toBe(400);
    expect(mocks.executeApprovedNotificationBatch).not.toHaveBeenCalled();
  });

  it("requires an expected attempt id", async () => {
    const response = await POST(request({
      workerId: "qa-worker",
      limit: 1
    }));

    expect(response.status).toBe(400);
    expect(mocks.executeApprovedNotificationBatch).not.toHaveBeenCalled();
  });

  it("forwards the exact attempt binding to the executor", async () => {
    const response = await POST(request({
      workerId: "qa-worker",
      limit: 1,
      expectedAttemptId
    }));

    expect(response.status).toBe(200);
    expect(mocks.executeApprovedNotificationBatch).toHaveBeenCalledTimes(1);
    expect(mocks.executeApprovedNotificationBatch).toHaveBeenCalledWith({
      workerId: "qa-worker",
      limit: 1,
      expectedAttemptId
    });
  });

  it("proves the hosted Supabase project and organization authority without exposing secrets", async () => {
    const response = await GET(new Request(
      "http://localhost/api/internal/notification-worker",
      {
        headers: {
          "X-LeaguePilot-Worker-Token": workerToken,
          "X-LeaguePilot-Organization-Id": expectedAttemptId
        }
      }
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      projectRef: "preview-project",
      organization: {
        id: expectedAttemptId,
        providerSendsEnabled: false
      }
    });
  });
});
