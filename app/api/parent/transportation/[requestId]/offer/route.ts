import { NextResponse } from "next/server";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { offerTransportation } from "@/lib/supabase/transportation";

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const seats = Number(body?.seats);
  if (!Number.isInteger(seats) || seats < 1 || seats > 8) {
    return NextResponse.json({ ok: false, message: "Seat count must be between 1 and 8." }, { status: 400 });
  }
  const { requestId } = await context.params;
  const result = await offerTransportation({ requestId, actorUserId: auth.user.id, seats });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
