import { NextResponse } from "next/server";
import { findFamilyAccessStatus } from "@/lib/supabase/access-activation";
import {
  checkPublicIntakeRateLimit,
  getPublicClientKey,
  publicIntakeRateLimitHeaders
} from "@/lib/public-intake/rate-limit";

export async function POST(request: Request) {
  const rateLimit = checkPublicIntakeRateLimit("registration_status", getPublicClientKey(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many status checks. Please try again later." },
      { status: 429, headers: publicIntakeRateLimitHeaders(rateLimit) }
    );
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, message: "Request reference and email are required." },
      { status: 400, headers: publicIntakeRateLimitHeaders(rateLimit) }
    );
  }
  const result = await findFamilyAccessStatus({
    reference: String(body.reference ?? ""),
    email: String(body.email ?? "")
  });
  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
    headers: publicIntakeRateLimitHeaders(rateLimit)
  });
}
