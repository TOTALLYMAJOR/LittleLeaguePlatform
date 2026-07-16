import { NextResponse } from "next/server";
import { applyPublicRateLimit, PUBLIC_RATE_LIMITS } from "@/lib/supabase/public-rate-limit";
import { createPendingRegistration } from "@/lib/supabase/registrations";

export async function POST(request: Request) {
  const rateLimit = await applyPublicRateLimit(request, PUBLIC_RATE_LIMITS.registrationRequests);
  if (!rateLimit.allowed) {
    return NextResponse.json({
      ok: false,
      message: "Too many registration requests. Please wait before trying again."
    }, {
      status: 429,
      headers: rateLimit.headers
    });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Registration request body is required." }, { status: 400, headers: rateLimit.headers });
  }

  const result = await createPendingRegistration({
    teamId: String(body.teamId ?? ""),
    parentName: String(body.parentName ?? ""),
    parentEmail: String(body.parentEmail ?? ""),
    playerFirstName: String(body.playerFirstName ?? ""),
    playerLastInitial: String(body.playerLastInitial ?? "")
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400, headers: rateLimit.headers });
}
