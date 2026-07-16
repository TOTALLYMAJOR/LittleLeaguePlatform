import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postRegistration } from "./api/registration-requests/route";
import { POST as postMobileUsageEvent } from "./api/mobile-usage-events/route";
import { createPendingRegistration } from "@/lib/supabase/registrations";
import { recordMobileUsageEvent } from "@/lib/supabase/operations";
import { resetPublicIntakeRateLimits } from "@/lib/public-intake/rate-limit";

vi.mock("@/lib/supabase/registrations", () => ({
  createPendingRegistration: vi.fn(),
}));

vi.mock("@/lib/supabase/operations", () => ({
  recordMobileUsageEvent: vi.fn(),
}));

const createPendingRegistrationMock = vi.mocked(createPendingRegistration);
const recordMobileUsageEventMock = vi.mocked(recordMobileUsageEvent);

function jsonRequest(path: string, body: unknown, ip = "203.0.113.10") {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("public intake abuse controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPublicIntakeRateLimits();
    createPendingRegistrationMock.mockResolvedValue({
      ok: true,
      message: "Registration request saved.",
    });
    recordMobileUsageEventMock.mockResolvedValue({
      ok: true,
      message: "Mobile usage event recorded.",
    });
  });

  it("allows legitimate registration intake and exposes rate-limit headers", async () => {
    const response = await postRegistration(
      jsonRequest("/api/registration-requests", {
        teamId: "team-1",
        parentName: "Parent Example",
        parentEmail: "parent@example.com",
        playerFirstName: "Player",
        playerLastInitial: "E",
      }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("4");
    expect(response.headers.get("Retry-After")).toBeNull();
    expect(createPendingRegistrationMock).toHaveBeenCalledOnce();
  });

  it("throttles registration bursts per client IP", async () => {
    const body = {
      teamId: "team-1",
      parentName: "Parent Example",
      parentEmail: "parent@example.com",
      playerFirstName: "Player",
      playerLastInitial: "E",
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(
        (
          await postRegistration(
            jsonRequest("/api/registration-requests", body),
          )
        ).status,
      ).toBe(201);
    }

    const response = await postRegistration(
      jsonRequest("/api/registration-requests", body),
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload).toEqual({
      ok: false,
      message: "Too many registration requests. Please try again later.",
    });
    expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response.headers.get("Retry-After")).toBeTruthy();
    expect(createPendingRegistrationMock).toHaveBeenCalledTimes(5);
  });

  it("allows mobile telemetry under its higher legitimate-use budget", async () => {
    const response = await postMobileUsageEvent(
      jsonRequest("/api/mobile-usage-events", {
        eventType: "install_prompt_shown",
        routePath: "/parent",
      }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("60");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("59");
    expect(recordMobileUsageEventMock).toHaveBeenCalledOnce();
  });

  it("throttles anonymous mobile telemetry bursts per client IP", async () => {
    const body = { eventType: "install_prompt_shown" };

    for (let attempt = 0; attempt < 60; attempt += 1) {
      expect(
        (
          await postMobileUsageEvent(
            jsonRequest("/api/mobile-usage-events", body),
          )
        ).status,
      ).toBe(201);
    }

    const response = await postMobileUsageEvent(
      jsonRequest("/api/mobile-usage-events", body),
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload).toEqual({
      ok: false,
      message: "Too many usage events. Please try again later.",
    });
    expect(response.headers.get("X-RateLimit-Limit")).toBe("60");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response.headers.get("Retry-After")).toBeTruthy();
    expect(recordMobileUsageEventMock).toHaveBeenCalledTimes(60);
  });
});
