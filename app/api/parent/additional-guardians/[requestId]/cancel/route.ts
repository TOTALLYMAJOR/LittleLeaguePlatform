import { NextResponse } from "next/server";
import { cancelAdditionalGuardianRequest } from "@/lib/supabase/additional-guardians";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const { requestId } = await context.params;
  const result = await cancelAdditionalGuardianRequest({ requestId, actorUserId: auth.user.id });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
