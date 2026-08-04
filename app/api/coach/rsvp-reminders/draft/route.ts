import { NextResponse } from "next/server";
import { createCoachRsvpReminderDraft } from "@/lib/supabase/operations";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "RSVP reminder draft details are required." }, { status: 400 });
  }

  const result = await createCoachRsvpReminderDraft({
    teamId: String(body.teamId ?? ""),
    eventId: String(body.eventId ?? ""),
    parentUserId: String(body.parentUserId ?? ""),
    actorUserId: auth.user.id
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
