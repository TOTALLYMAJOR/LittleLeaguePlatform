import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  evaluatePublicRateLimit,
  type PublicRateLimitStore
} from "./public-rate-limit";

function request() {
  return new Request("http://localhost/api/registration-requests", {
    headers: {
      "x-forwarded-for": "203.0.113.10",
      "user-agent": "Vitest"
    }
  });
}

function memoryStore(): PublicRateLimitStore {
  const buckets = new Map<string, number>();
  return {
    async claim(input) {
      const hitCount = (buckets.get(input.bucketKey) ?? 0) + 1;
      buckets.set(input.bucketKey, hitCount);
      return {
        hitCount,
        allowed: hitCount <= input.limit
      };
    }
  };
}

describe("public intake rate limiting", () => {
  it("limits bursts and preserves rate-limit headers", async () => {
    const store = memoryStore();
    const policy = { routeKey: "registration-requests", limit: 2, windowMs: 60_000 };
    const first = await evaluatePublicRateLimit({ request: request(), policy, nowMs: 1000, store });
    const second = await evaluatePublicRateLimit({ request: request(), policy, nowMs: 1000, store });
    const third = await evaluatePublicRateLimit({ request: request(), policy, nowMs: 1000, store });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(third.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(third.headers.get("Retry-After")).toBe("59");
  });

  it("fails closed when the shared store is unavailable", async () => {
    const failingStore: PublicRateLimitStore = {
      async claim() {
        throw new Error("store unavailable");
      }
    };
    const result = await evaluatePublicRateLimit({
      request: request(),
      policy: { routeKey: "mobile-usage-events", limit: 1, windowMs: 60_000 },
      nowMs: 1000,
      store: failingStore
    });

    expect(result.available).toBe(false);
    expect(result.allowed).toBe(false);
    expect(result.store).toBe("unavailable");
    expect(result.headers.get("X-RateLimit-Limit")).toBe("1");
    expect(result.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(result.headers.get("Retry-After")).toBe("5");
  });

  it("prefers the platform forwarding header and restricts the durable RPC", async () => {
    const claimedKeys: string[] = [];
    const store: PublicRateLimitStore = {
      async claim(input) {
        claimedKeys.push(input.bucketKey);
        return { hitCount: 1, allowed: true };
      }
    };
    const policy = { routeKey: "registration-requests", limit: 5, windowMs: 60_000 };
    for (const spoofedIp of ["203.0.113.10", "198.51.100.12"]) {
      await evaluatePublicRateLimit({
        request: new Request("http://localhost/api/registration-requests", {
          headers: {
            "x-vercel-forwarded-for": "192.0.2.20",
            "x-forwarded-for": spoofedIp,
            "user-agent": "Vitest"
          }
        }),
        policy,
        nowMs: 1000,
        store
      });
    }

    expect(claimedKeys[0]).toBe(claimedKeys[1]);
    const migration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260729144500_public_rate_limits.sql"),
      "utf8"
    );
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("Invalid public rate-limit claim.");
  });
});
