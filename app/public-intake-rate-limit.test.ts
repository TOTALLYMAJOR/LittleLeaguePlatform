import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postRegistration } from "./api/registration-requests/route";
import { POST as postRegistrationStatus } from "./api/registration-requests/status/route";
import { POST as postInviteRecovery } from "./api/invites/recover/route";
import { POST as postMobileUsageEvent } from "./api/mobile-usage-events/route";
import { createPendingRegistration } from "@/lib/supabase/registrations";
import { recordMobileUsageEvent } from "@/lib/supabase/operations";
import { findFamilyAccessStatus, requestInvitationRecovery } from "@/lib/supabase/access-activation";
import { resetPublicIntakeRateLimits } from "@/lib/public-intake/rate-limit";

const sharedRateLimitBuckets = vi.hoisted(() => new Map<string, number>());

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    rpc: (_name: string, args: { p_bucket_key: string; p_limit: number }) => ({
      single: async () => {
        const hitCount = (sharedRateLimitBuckets.get(args.p_bucket_key) ?? 0) + 1;
        sharedRateLimitBuckets.set(args.p_bucket_key, hitCount);
        return {
          data: { hit_count: hitCount, allowed: hitCount <= args.p_limit },
          error: null
        };
      }
    })
  })
}));

vi.mock("@/lib/supabase/registrations", () => ({
  createPendingRegistration: vi.fn(),
}));

vi.mock("@/lib/supabase/operations", () => ({
  recordMobileUsageEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/access-activation", () => ({
  findFamilyAccessStatus: vi.fn(),
  requestInvitationRecovery: vi.fn(),
}));

const createPendingRegistrationMock = vi.mocked(createPendingRegistration);
const recordMobileUsageEventMock = vi.mocked(recordMobileUsageEvent);
const findFamilyAccessStatusMock = vi.mocked(findFamilyAccessStatus);
const requestInvitationRecoveryMock = vi.mocked(requestInvitationRecovery);

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
    sharedRateLimitBuckets.clear();
    resetPublicIntakeRateLimits();
    createPendingRegistrationMock.mockResolvedValue({
      ok: true,
      message: "Registration request saved.",
    });
    recordMobileUsageEventMock.mockResolvedValue({
      ok: true,
      message: "Mobile usage event recorded.",
    });
    findFamilyAccessStatusMock.mockResolvedValue({
      ok: true,
      message: "League review in progress",
    });
    requestInvitationRecoveryMock.mockResolvedValue({
      ok: true,
      message: "If an invitation matches, the league will review it.",
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

  it("rate-limits access status without returning private data from the route itself", async () => {
    const response = await postRegistrationStatus(
      jsonRequest("/api/registration-requests/status", {
        reference: "10000000-0000-4000-8000-000000000001",
        email: "parent@example.com",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("8");
    expect(findFamilyAccessStatusMock).toHaveBeenCalledWith({
      reference: "10000000-0000-4000-8000-000000000001",
      email: "parent@example.com",
    });
  });

  it("keeps invitation recovery enumeration-safe and provider-free", async () => {
    const response = await postInviteRecovery(
      jsonRequest("/api/invites/recover", { email: "parent@example.com" }),
    );
    expect(response.status).toBe(202);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(requestInvitationRecoveryMock).toHaveBeenCalledWith({ email: "parent@example.com" });
  });

  it("allows mobile telemetry under its higher legitimate-use budget", async () => {
    const response = await postMobileUsageEvent(
      jsonRequest("/api/mobile-usage-events", {
        eventType: "install_prompt_shown",
        routePath: "/parent",
      }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("120");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("119");
    expect(recordMobileUsageEventMock).toHaveBeenCalledOnce();
  });

  it("throttles anonymous mobile telemetry bursts per client IP", async () => {
    const body = { eventType: "install_prompt_shown" };

    for (let attempt = 0; attempt < 120; attempt += 1) {
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
    expect(response.headers.get("X-RateLimit-Limit")).toBe("120");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response.headers.get("Retry-After")).toBeTruthy();
    expect(recordMobileUsageEventMock).toHaveBeenCalledTimes(120);
  });
});
