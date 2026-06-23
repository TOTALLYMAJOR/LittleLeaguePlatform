import { NextResponse } from "next/server";
import { createTeamMembership } from "@/lib/supabase/memberships";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Membership request body is required." }, { status: 400 });
  }

  const role = body.role === "parent" ? "parent" : "coach";
  const result = await createTeamMembership({
    teamId: String(body.teamId ?? ""),
    userId: String(body.userId ?? ""),
    role
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
