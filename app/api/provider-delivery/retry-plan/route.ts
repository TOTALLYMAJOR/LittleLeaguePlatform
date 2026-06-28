import { NextResponse } from "next/server";
import { listProviderDeliveryRetryQueue } from "@/lib/supabase/provider-delivery";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const result = await listProviderDeliveryRetryQueue({
    actorUserId: auth.user.id
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
