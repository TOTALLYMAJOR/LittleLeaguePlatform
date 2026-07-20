import { NextResponse } from "next/server";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { createStripeConnectOnboarding } from "@/lib/supabase/payments";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, message: "Organization is required." }, { status: 400 });
  const result = await createStripeConnectOnboarding({
    organizationId: String(body.organizationId ?? ""),
    actorUserId: auth.user.id
  });
  return NextResponse.json(result, { status: result.ok ? 201 : result.code === "feature_disabled" ? 503 : 400 });
}
