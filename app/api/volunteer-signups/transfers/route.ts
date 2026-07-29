import { NextResponse } from "next/server";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { requestVolunteerTransfer } from "@/lib/supabase/volunteer-marketplace";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const actionId = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!body || !actionId) {
    return NextResponse.json({ ok: false, message: "Transfer request requires role and action receipt." }, { status: 400 });
  }
  const result = await requestVolunteerTransfer({
    signupId: String(body.signupId ?? ""),
    userId: auth.user.id,
    reason: String(body.reason ?? ""),
    actionId
  });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
