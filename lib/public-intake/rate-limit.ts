export type PublicIntakeRoute = "registration" | "registration_status" | "invite_recovery" | "invite_preview" | "mobile_usage";

type RateLimitPolicy = {
  maxRequests: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
};

const policies: Record<PublicIntakeRoute, RateLimitPolicy> = {
  registration: { maxRequests: 5, windowMs: 60_000 },
  registration_status: { maxRequests: 8, windowMs: 60_000 },
  invite_recovery: { maxRequests: 5, windowMs: 60_000 },
  invite_preview: { maxRequests: 8, windowMs: 60_000 },
  mobile_usage: { maxRequests: 60, windowMs: 60_000 },
};

const requestTimestamps = new Map<string, number[]>();
const MAX_TRACKED_CLIENTS = 10_000;

function policyKey(route: PublicIntakeRoute, clientKey: string) {
  return `${route}:${clientKey}`;
}

function pruneExpiredClients(now: number) {
  if (requestTimestamps.size < MAX_TRACKED_CLIENTS) return;

  for (const [key, timestamps] of requestTimestamps) {
    if (
      !timestamps.length ||
      timestamps[timestamps.length - 1]! <= now - policies.registration.windowMs
    ) {
      requestTimestamps.delete(key);
    }
  }

  while (requestTimestamps.size >= MAX_TRACKED_CLIENTS) {
    const oldestKey = requestTimestamps.keys().next().value as
      string | undefined;
    if (!oldestKey) break;
    requestTimestamps.delete(oldestKey);
  }
}

export function getPublicClientKey(request: Request) {
  const forwarded = [
    request.headers.get("x-vercel-forwarded-for"),
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-real-ip"),
  ]
    .flatMap((value) => value?.split(",") ?? [])
    .map((value) => value.trim().replace(/^"|"$/g, ""))
    .find(Boolean);

  return forwarded ? `ip:${forwarded}` : "anonymous";
}

export function checkPublicIntakeRateLimit(
  route: PublicIntakeRoute,
  clientKey: string,
  now = Date.now(),
): RateLimitResult {
  const policy = policies[route];
  const key = policyKey(route, clientKey || "anonymous");
  const windowStart = now - policy.windowMs;
  const timestamps = (requestTimestamps.get(key) ?? []).filter(
    (timestamp) => timestamp > windowStart,
  );

  pruneExpiredClients(now);

  const resetAt = (timestamps[0] ?? now) + policy.windowMs;
  if (timestamps.length >= policy.maxRequests) {
    requestTimestamps.set(key, timestamps);
    return {
      allowed: false,
      limit: policy.maxRequests,
      remaining: 0,
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }

  timestamps.push(now);
  requestTimestamps.set(key, timestamps);

  return {
    allowed: true,
    limit: policy.maxRequests,
    remaining: policy.maxRequests - timestamps.length,
    resetAt: (timestamps[0] ?? now) + policy.windowMs,
  };
}

export function publicIntakeRateLimitHeaders(result: RateLimitResult) {
  const headers = new Headers({
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  });

  if (result.retryAfterSeconds !== undefined) {
    headers.set("Retry-After", String(result.retryAfterSeconds));
  }

  return headers;
}

export function resetPublicIntakeRateLimits() {
  requestTimestamps.clear();
}
