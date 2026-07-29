import { NextResponse } from "next/server";
import { createPendingRegistration } from "@/lib/supabase/registrations";
import {
  checkPublicIntakeRateLimit,
  getPublicClientKey,
  publicIntakeRateLimitHeaders,
} from "@/lib/public-intake/rate-limit";

export async function POST(request: Request) {
  const rateLimit = checkPublicIntakeRateLimit(
    "registration",
    getPublicClientKey(request),
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: "Too many registration requests. Please try again later.",
      },
      { status: 429, headers: publicIntakeRateLimitHeaders(rateLimit) },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, message: "Registration request body is required." },
      { status: 400, headers: publicIntakeRateLimitHeaders(rateLimit) },
    );
  }

  const result = await createPendingRegistration({
    teamId: String(body.teamId ?? ""),
    parentName: String(body.parentName ?? ""),
    parentEmail: String(body.parentEmail ?? ""),
    playerFirstName: String(body.playerFirstName ?? ""),
    playerLastInitial: String(body.playerLastInitial ?? ""),
  });

  return NextResponse.json(result, {
    status: result.ok ? 201 : 400,
    headers: publicIntakeRateLimitHeaders(rateLimit),
  });
}
