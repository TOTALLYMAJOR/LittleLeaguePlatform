import { NextResponse } from "next/server";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { joinVolunteerWaitlist, withdrawVolunteerWaitlist } from "@/lib/supabase/volunteer-marketplace";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const actionId = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!body || !actionId) {
    return NextResponse.json({ ok: false, message: "Waitlist action requires role and action receipt." }, { status: 400 });
  }
  const result = await joinVolunteerWaitlist({
    signupId: String(body.signupId ?? ""),
    userId: auth.user.id,
    actionId
  });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}

export async function DELETE(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, message: "Waitlist entry is required." }, { status: 400 });
  const result = await withdrawVolunteerWaitlist({
    waitlistEntryId: String(body.waitlistEntryId ?? ""),
    userId: auth.user.id
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
