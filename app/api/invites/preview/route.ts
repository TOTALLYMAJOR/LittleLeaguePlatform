import { NextResponse } from "next/server";
import { previewParentInvite } from "@/lib/supabase/invite-acceptance";
import { checkPublicIntakeRateLimit, getPublicClientKey, publicIntakeRateLimitHeaders } from "@/lib/public-intake/rate-limit";

export async function POST(request: Request) {
  const rateLimit = checkPublicIntakeRateLimit("invite_preview", getPublicClientKey(request));
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false, message: "Too many invitation checks. Try again later." }, { status: 429, headers: publicIntakeRateLimitHeaders(rateLimit) });
  }
  const body = await request.json().catch(() => null);
  const result = await previewParentInvite(String(body?.token ?? ""));
  return NextResponse.json(result, { status: result.ok ? 200 : 400, headers: publicIntakeRateLimitHeaders(rateLimit) });
}
