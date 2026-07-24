import { NextResponse } from "next/server";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { acceptTemporaryCaregiverAuthorization } from "@/lib/supabase/temporary-caregivers";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const result = await acceptTemporaryCaregiverAuthorization({
    token: String(body?.token ?? ""),
    actorUserId: auth.user.id
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
