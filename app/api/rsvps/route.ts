import { NextResponse } from "next/server";
import { updateParentRsvp } from "@/lib/supabase/operations";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const responses = new Set(["going", "not_going", "maybe", "cancelled"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "RSVP body is required." }, { status: 400 });
  }

  const response = String(body.response ?? "");
  if (!responses.has(response)) {
    return NextResponse.json({ ok: false, message: "Unsupported RSVP response." }, { status: 400 });
  }

  const result = await updateParentRsvp({
    eventId: String(body.eventId ?? ""),
    playerId: String(body.playerId ?? ""),
    parentUserId: auth.user.id,
    response: response as "going" | "not_going" | "maybe" | "cancelled",
    note: body.note ? String(body.note) : undefined
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
