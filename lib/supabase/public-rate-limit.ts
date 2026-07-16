import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Rate-limit RPC is staged until generated types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(name: string, args: Record<string, unknown>): any;
};

export interface PublicRateLimitPolicy {
  routeKey: string;
  limit: number;
  windowMs: number;
}

export interface PublicRateLimitStore {
  claim(input: {
    bucketKey: string;
    routeKey: string;
    windowStart: string;
    expiresAt: string;
    limit: number;
  }): Promise<{ hitCount: number; allowed: boolean }>;
}

export const PUBLIC_RATE_LIMITS = {
  registrationRequests: {
    routeKey: "registration-requests",
    limit: 5,
    windowMs: 60_000
  },
  mobileUsageEvents: {
    routeKey: "mobile-usage-events",
    limit: 120,
    windowMs: 60_000
  }
} satisfies Record<string, PublicRateLimitPolicy>;

const memoryBuckets = new Map<string, { hitCount: number; expiresAtMs: number }>();

function adminDb() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

function clientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

function clientFingerprint(request: Request, routeKey: string) {
  const hash = createHash("sha256");
  hash.update(routeKey);
  hash.update(":");
  hash.update(clientIp(request));
  hash.update(":");
  hash.update(request.headers.get("user-agent") ?? "");
  return hash.digest("hex");
}

function bucketKey(input: {
  routeKey: string;
  fingerprint: string;
  windowStartMs: number;
}) {
  return `${input.routeKey}:${input.fingerprint}:${input.windowStartMs}`;
}

export function publicRateLimitHeaders(input: {
  limit: number;
  remaining: number;
  resetAtMs: number;
  retryAfterSeconds?: number;
}) {
  const headers = new Headers({
    "X-RateLimit-Limit": String(input.limit),
    "X-RateLimit-Remaining": String(Math.max(0, input.remaining)),
    "X-RateLimit-Reset": String(Math.ceil(input.resetAtMs / 1000))
  });
  if (input.retryAfterSeconds !== undefined) {
    headers.set("Retry-After", String(input.retryAfterSeconds));
  }
  return headers;
}

function memoryStore(): PublicRateLimitStore {
  return {
    async claim(input) {
      const expiresAtMs = new Date(input.expiresAt).getTime();
      const existing = memoryBuckets.get(input.bucketKey);
      const hitCount = existing && existing.expiresAtMs > Date.now()
        ? existing.hitCount + 1
        : 1;
      memoryBuckets.set(input.bucketKey, { hitCount, expiresAtMs });
      return {
        hitCount,
        allowed: hitCount <= input.limit
      };
    }
  };
}

function supabaseRateLimitStore(): PublicRateLimitStore {
  return {
    async claim(input) {
      const { data, error } = await withSupabaseTimeout(adminDb()
        .rpc("claim_public_rate_limit", {
          p_bucket_key: input.bucketKey,
          p_route_key: input.routeKey,
          p_window_start: input.windowStart,
          p_expires_at: input.expiresAt,
          p_limit: input.limit
        })
        .single(), 3000) as {
          data: { hit_count: number; allowed: boolean } | null;
          error: { message?: string } | null;
        };

      if (error || !data) throw new Error("Public rate limit store unavailable.");
      return {
        hitCount: data.hit_count,
        allowed: data.allowed
      };
    }
  };
}

export async function evaluatePublicRateLimit(input: {
  request: Request;
  policy: PublicRateLimitPolicy;
  nowMs?: number;
  store?: PublicRateLimitStore;
  fallbackStore?: PublicRateLimitStore;
}) {
  const nowMs = input.nowMs ?? Date.now();
  const windowStartMs = Math.floor(nowMs / input.policy.windowMs) * input.policy.windowMs;
  const resetAtMs = windowStartMs + input.policy.windowMs;
  const key = bucketKey({
    routeKey: input.policy.routeKey,
    fingerprint: clientFingerprint(input.request, input.policy.routeKey),
    windowStartMs
  });
  const claimInput = {
    bucketKey: key,
    routeKey: input.policy.routeKey,
    windowStart: new Date(windowStartMs).toISOString(),
    expiresAt: new Date(resetAtMs).toISOString(),
    limit: input.policy.limit
  };

  let storeName: "shared" | "memory_fallback" = "shared";
  let claim: { hitCount: number; allowed: boolean };
  try {
    claim = await (input.store ?? supabaseRateLimitStore()).claim(claimInput);
  } catch {
    storeName = "memory_fallback";
    claim = await (input.fallbackStore ?? memoryStore()).claim(claimInput);
  }

  const remaining = Math.max(0, input.policy.limit - claim.hitCount);
  const retryAfterSeconds = claim.allowed ? undefined : Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));
  return {
    allowed: claim.allowed,
    hitCount: claim.hitCount,
    remaining,
    resetAtMs,
    retryAfterSeconds,
    store: storeName,
    headers: publicRateLimitHeaders({
      limit: input.policy.limit,
      remaining,
      resetAtMs,
      retryAfterSeconds
    })
  };
}

export async function applyPublicRateLimit(request: Request, policy: PublicRateLimitPolicy) {
  return evaluatePublicRateLimit({ request, policy });
}
