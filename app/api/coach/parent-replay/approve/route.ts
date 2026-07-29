import { NextResponse } from "next/server";
import { approveParentReplay } from "@/lib/supabase/operations";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !body.parentReplayId) {
    return NextResponse.json({ ok: false, message: "Parent Replay id is required." }, { status: 400 });
  }
  const result = await approveParentReplay({
    parentReplayId: String(body.parentReplayId),
    actorUserId: auth.user.id
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
