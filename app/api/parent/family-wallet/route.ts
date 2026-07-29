import { NextResponse } from "next/server";
import { listFamilyBalanceSummary } from "@/lib/supabase/family-balance";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const balance = await listFamilyBalanceSummary(auth.user.id);
  return NextResponse.json({
    ...balance,
    message: `${balance.message} This legacy URL now delegates to Family Balance Summary.`,
    balance,
    wallet: balance,
    deprecated: true
  }, { status: balance.ok ? 200 : 503 });
}
