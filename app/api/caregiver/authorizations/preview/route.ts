import { NextResponse } from "next/server";
import { checkPublicIntakeRateLimit, getPublicClientKey, publicIntakeRateLimitHeaders } from "@/lib/public-intake/rate-limit";
import { previewTemporaryCaregiverInvitation } from "@/lib/supabase/temporary-caregivers";

export async function POST(request: Request) {
  const rateLimit = checkPublicIntakeRateLimit("caregiver_preview", getPublicClientKey(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, message: "Too many caregiver invitation checks. Try again later." },
      { status: 429, headers: publicIntakeRateLimitHeaders(rateLimit) }
    );
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const result = await previewTemporaryCaregiverInvitation(String(body?.token ?? ""));
  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
    headers: publicIntakeRateLimitHeaders(rateLimit)
  });
}
