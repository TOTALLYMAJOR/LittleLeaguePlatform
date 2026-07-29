import { NextResponse } from "next/server";
import { claimVolunteerRoleSafely } from "@/lib/supabase/volunteer-marketplace";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Volunteer claim body is required." }, { status: 400 });
  }

  const actionId = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!actionId) {
    return NextResponse.json({ ok: false, message: "Volunteer claim requires an action receipt." }, { status: 400 });
  }
  const result = await claimVolunteerRoleSafely({
    signupId: String(body.signupId ?? ""),
    userId: auth.user.id,
    actionId
  });

  const code = "code" in result ? String(result.code ?? "") : "";
  return NextResponse.json(result, { status: result.ok ? 200 : code === "already_claimed" ? 409 : 400 });
}
