import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { runNotificationProviderSendWorker } from "@/lib/services/notifications/execution";

vi.mock("@/lib/services/notifications/execution", () => ({
  runNotificationProviderSendWorker: vi.fn()
}));

const workerMock = vi.mocked(runNotificationProviderSendWorker);

function request(input: { token?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {
    "content-type": "application/json"
  };
  if (input.token) headers.authorization = `Bearer ${input.token}`;

  return new Request("http://localhost/api/internal/notification-send-worker", {
    method: "POST",
    headers,
    body: JSON.stringify(input.body ?? {})
  });
}

describe("notification send worker route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("stays unavailable until the server-only worker secret is configured", async () => {
    const response = await POST(request({ token: "secret" }));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(workerMock).not.toHaveBeenCalled();
  });

  it("rejects requests without the worker secret", async () => {
    vi.stubEnv("NOTIFICATION_WORKER_SECRET", "secret");

    const response = await POST(request({ token: "wrong" }));

    expect(response.status).toBe(401);
    expect(workerMock).not.toHaveBeenCalled();
  });

  it("runs the provider worker with a bounded limit", async () => {
    vi.stubEnv("NOTIFICATION_WORKER_SECRET", "secret");
    workerMock.mockResolvedValue({
      ok: true,
      message: "1 notification delivery attempt(s) processed by provider worker.",
      claimed: 1,
      sent: 1,
      failed: 0,
      suppressed: 0,
      retrying: 0,
      deadLettered: 0,
      outcomes: []
    });

    const response = await POST(request({
      token: "secret",
      body: { workerId: "worker-a", limit: 250 }
    }));

    expect(response.status).toBe(200);
    expect(workerMock).toHaveBeenCalledWith({
      workerId: "worker-a",
      limit: 100
    });
  });
});
