import { NextResponse } from "next/server";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { revokeTemporaryCaregiverAuthorization } from "@/lib/supabase/temporary-caregivers";

export async function POST(request: Request, context: { params: Promise<{ authorizationId: string }> }) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const reason = String(body?.reason ?? "").trim();
  if (reason.length < 10 || reason.length > 500) {
    return NextResponse.json({ ok: false, message: "Revocation reason must be 10 to 500 characters." }, { status: 400 });
  }
  const { authorizationId } = await context.params;
  const result = await revokeTemporaryCaregiverAuthorization({
    authorizationId,
    actorUserId: auth.user.id,
    reason
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
