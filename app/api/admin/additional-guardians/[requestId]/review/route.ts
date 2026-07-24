import { NextResponse } from "next/server";
import { reviewAdditionalGuardianRequest } from "@/lib/supabase/additional-guardians";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Review details are required." }, { status: 400 });
  }
  const decision = String((body as { decision?: unknown }).decision ?? "");
  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ ok: false, message: "Choose approve or decline." }, { status: 400 });
  }
  const { requestId } = await context.params;
  const result = await reviewAdditionalGuardianRequest({
    requestId,
    actorUserId: auth.user.id,
    decision,
    reason: String((body as { reason?: unknown }).reason ?? "")
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
