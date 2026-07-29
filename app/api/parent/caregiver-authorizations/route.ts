import { NextResponse } from "next/server";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { createTemporaryCaregiverAuthorization } from "@/lib/supabase/temporary-caregivers";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const eventIds = Array.isArray(body?.eventIds)
    ? body.eventIds.filter((value): value is string => typeof value === "string")
    : [];
  if (!body || typeof body.allowPickup !== "boolean") {
    return NextResponse.json({ ok: false, message: "Temporary caregiver scope is required." }, { status: 400 });
  }
  const result = await createTemporaryCaregiverAuthorization({
    actorUserId: auth.user.id,
    playerId: String(body.playerId ?? ""),
    caregiverEmail: String(body.caregiverEmail ?? ""),
    eventIds,
    allowPickup: body.allowPickup,
    startsAt: String(body.startsAt ?? ""),
    expiresAt: String(body.expiresAt ?? "")
  });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
