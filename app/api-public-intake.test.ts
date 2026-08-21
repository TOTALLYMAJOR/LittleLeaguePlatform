import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postRegistrationRequest } from "./api/registration-requests/route";
import { POST as postMobileUsageEvent } from "./api/mobile-usage-events/route";
import { createPendingRegistration } from "@/lib/supabase/registrations";
import { recordMobileUsageEvent } from "@/lib/supabase/operations";
import { applyPublicRateLimit } from "@/lib/supabase/public-rate-limit";

vi.mock("@/lib/supabase/registrations", () => ({
  createPendingRegistration: vi.fn()
}));

vi.mock("@/lib/supabase/operations", () => ({
  recordMobileUsageEvent: vi.fn()
}));

vi.mock("@/lib/supabase/public-rate-limit", () => ({
  PUBLIC_RATE_LIMITS: {
    registrationRequests: { routeKey: "registration-requests", limit: 5, windowMs: 60_000 },
    mobileUsageEvents: { routeKey: "mobile-usage-events", limit: 120, windowMs: 60_000 }
  },
  applyPublicRateLimit: vi.fn()
}));

const createPendingRegistrationMock = vi.mocked(createPendingRegistration);
const recordMobileUsageEventMock = vi.mocked(recordMobileUsageEvent);
const applyPublicRateLimitMock = vi.mocked(applyPublicRateLimit);

function allowedRateLimit(limit = "5") {
  return {
    available: true,
    allowed: true,
    hitCount: 1,
    remaining: Number(limit) - 1,
    resetAtMs: 1790000000000,
    retryAfterSeconds: undefined,
    store: "shared" as const,
    headers: new Headers({
      "X-RateLimit-Limit": limit,
      "X-RateLimit-Remaining": String(Number(limit) - 1),
      "X-RateLimit-Reset": "1790000000"
    })
  };
}

function blockedRateLimit(limit = "5") {
  return {
    available: true,
    allowed: false,
    hitCount: Number(limit) + 1,
    remaining: 0,
    resetAtMs: 1790000000000,
    retryAfterSeconds: 60,
    store: "shared" as const,
    headers: new Headers({
      "X-RateLimit-Limit": limit,
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": "1790000000",
      "Retry-After": "60"
    })
  };
}

function unavailableRateLimit(limit = "5") {
  return {
    available: false,
    allowed: false,
    hitCount: 0,
    remaining: 0,
    resetAtMs: 1790000005000,
    retryAfterSeconds: 5,
    store: "unavailable" as const,
    headers: new Headers({
      "X-RateLimit-Limit": limit,
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": "1790000005",
      "Retry-After": "5"
    })
  };
}

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.10"
    },
    body: JSON.stringify(body)
  });
}

describe("public intake API rate limits", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    applyPublicRateLimitMock.mockResolvedValue(allowedRateLimit());
  });

  it("returns 429 for registration bursts before creating requests", async () => {
    applyPublicRateLimitMock.mockResolvedValue(blockedRateLimit());

    const response = await postRegistrationRequest(jsonRequest("http://localhost/api/registration-requests", {
      teamId: "team-1",
      parentName: "Taylor Parent",
      parentEmail: "parent@example.com",
      playerFirstName: "Mason",
      playerLastInitial: "M"
    }));
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(payload.ok).toBe(false);
    expect(createPendingRegistrationMock).not.toHaveBeenCalled();
  });

  it("returns 503 and fails closed when registration abuse protection is unavailable", async () => {
    applyPublicRateLimitMock.mockResolvedValue(unavailableRateLimit());

    const response = await postRegistrationRequest(jsonRequest("http://localhost/api/registration-requests", {
      teamId: "team-1",
      parentName: "Taylor Parent",
      parentEmail: "parent@example.com",
      playerFirstName: "Mason",
      playerLastInitial: "M"
    }));

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("5");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(createPendingRegistrationMock).not.toHaveBeenCalled();
  });

  it("passes rate-limit headers through successful registration intake", async () => {
    createPendingRegistrationMock.mockResolvedValue({
      ok: true,
      message: "Registration saved.",
      request: { id: "registration-1" }
    } as Awaited<ReturnType<typeof createPendingRegistration>>);

    const response = await postRegistrationRequest(jsonRequest("http://localhost/api/registration-requests", {
      teamId: "team-1",
      parentName: "Taylor Parent",
      parentEmail: "parent@example.com",
      playerFirstName: "Mason",
      playerLastInitial: "M"
    }));

    expect(response.status).toBe(201);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(createPendingRegistrationMock).toHaveBeenCalledWith({
      teamId: "team-1",
      parentName: "Taylor Parent",
      parentEmail: "parent@example.com",
      playerFirstName: "Mason",
      playerLastInitial: "M"
    });
  });

  it("returns 429 for anonymous mobile usage bursts before recording telemetry", async () => {
    applyPublicRateLimitMock.mockResolvedValue(blockedRateLimit("120"));

    const response = await postMobileUsageEvent(jsonRequest("http://localhost/api/mobile-usage-events", {
      eventType: "install_prompt_shown",
      routePath: "/parent"
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("120");
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(recordMobileUsageEventMock).not.toHaveBeenCalled();
  });

  it("returns 503 and drops telemetry when shared abuse protection is unavailable", async () => {
    applyPublicRateLimitMock.mockResolvedValue(unavailableRateLimit("120"));

    const response = await postMobileUsageEvent(jsonRequest("http://localhost/api/mobile-usage-events", {
      eventType: "install_prompt_shown",
      routePath: "/parent"
    }));

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("5");
    expect(recordMobileUsageEventMock).not.toHaveBeenCalled();
  });
});
