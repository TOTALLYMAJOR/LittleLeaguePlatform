import { NextResponse } from "next/server";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { recordParentMediaConsent } from "@/lib/supabase/media-consents";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.granted !== "boolean") {
    return NextResponse.json({ ok: false, message: "Player and consent decision are required." }, { status: 400 });
  }

  const result = await recordParentMediaConsent({
    playerId: String(body.playerId ?? ""),
    parentUserId: auth.user.id,
    granted: body.granted
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 403 });
}
