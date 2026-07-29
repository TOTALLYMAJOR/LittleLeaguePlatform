import { NextResponse } from "next/server";
import {
  cancelFamilyEventHandoff,
  saveFamilyEventHandoff
} from "@/lib/supabase/family-flight-plan";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Caregiver coordination details are required." }, { status: 400 });
  }
  const action = String(body.action ?? "confirm");
  const result = action === "cancel"
    ? await cancelFamilyEventHandoff({
      parentUserId: auth.user.id,
      handoffId: String(body.handoffId ?? "")
    })
    : await saveFamilyEventHandoff({
      parentUserId: auth.user.id,
      playerId: String(body.playerId ?? ""),
      eventId: String(body.eventId ?? ""),
      caregiverLabel: String(body.caregiverLabel ?? ""),
      note: body.note ? String(body.note) : undefined
    });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
