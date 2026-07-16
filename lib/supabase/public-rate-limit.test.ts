import { describe, expect, it } from "vitest";
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

  it("falls back to memory when the shared store is unavailable", async () => {
    const failingStore: PublicRateLimitStore = {
      async claim() {
        throw new Error("store unavailable");
      }
    };
    const result = await evaluatePublicRateLimit({
      request: request(),
      policy: { routeKey: "mobile-usage-events", limit: 1, windowMs: 60_000 },
      nowMs: 1000,
      store: failingStore,
      fallbackStore: memoryStore()
    });

    expect(result.allowed).toBe(true);
    expect(result.store).toBe("memory_fallback");
    expect(result.headers.get("X-RateLimit-Limit")).toBe("1");
  });
});
