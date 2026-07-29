import { NextResponse } from "next/server";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { acceptParentInvite } from "@/lib/supabase/invite-acceptance";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  const body = await request.json().catch(() => null);
  const result = await acceptParentInvite({ token: String(body?.token ?? ""), userId: auth.user.id });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
