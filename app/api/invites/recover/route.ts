import { NextResponse } from "next/server";
import { requestInvitationRecovery } from "@/lib/supabase/access-activation";
import {
  checkPublicIntakeRateLimit,
  getPublicClientKey,
  publicIntakeRateLimitHeaders
} from "@/lib/public-intake/rate-limit";

export async function POST(request: Request) {
  const rateLimit = checkPublicIntakeRateLimit("invite_recovery", getPublicClientKey(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many recovery requests. Please try again later." },
      { status: 429, headers: publicIntakeRateLimitHeaders(rateLimit) }
    );
  }
  const body = await request.json().catch(() => null);
  const result = await requestInvitationRecovery({ email: String(body?.email ?? "") });
  return NextResponse.json(result, {
    status: result.ok ? 202 : 400,
    headers: publicIntakeRateLimitHeaders(rateLimit)
  });
}
