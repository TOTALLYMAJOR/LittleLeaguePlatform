import { NextResponse } from "next/server";
import { recordMobileUsageEvent } from "@/lib/supabase/operations";
import { applyPublicRateLimit, PUBLIC_RATE_LIMITS } from "@/lib/supabase/public-rate-limit";

const eventTypes = new Set([
  "install_prompt_shown",
  "install_prompt_accepted",
  "install_prompt_dismissed",
  "standalone_launch",
  "push_permission_requested",
  "native_app_interest"
]);

export async function POST(request: Request) {
  const rateLimit = await applyPublicRateLimit(request, PUBLIC_RATE_LIMITS.mobileUsageEvents);
  if (!rateLimit.allowed) {
    return NextResponse.json({
      ok: false,
      message: "Too many mobile usage events. Please wait before trying again."
    }, {
      status: 429,
      headers: rateLimit.headers
    });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Mobile usage event body is required." }, { status: 400, headers: rateLimit.headers });
  }

  const eventType = String(body.eventType ?? "");
  if (!eventTypes.has(eventType)) {
    return NextResponse.json({ ok: false, message: "Unsupported mobile usage event type." }, { status: 400, headers: rateLimit.headers });
  }

  const result = await recordMobileUsageEvent({
    eventType: eventType as "install_prompt_shown" | "install_prompt_accepted" | "install_prompt_dismissed" | "standalone_launch" | "push_permission_requested" | "native_app_interest",
    routePath: body.routePath ? String(body.routePath) : undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata as Record<string, string | number | boolean | null> : undefined
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400, headers: rateLimit.headers });
}
