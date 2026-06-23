import { NextResponse } from "next/server";
import { upsertFieldLocation } from "@/lib/supabase/operations";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Field location body is required." }, { status: 400 });
  }

  const result = await upsertFieldLocation({
    organizationId: String(body.organizationId ?? ""),
    name: String(body.name ?? ""),
    address: String(body.address ?? ""),
    latitude: body.latitude === undefined ? undefined : Number(body.latitude),
    longitude: body.longitude === undefined ? undefined : Number(body.longitude),
    googlePlaceId: body.googlePlaceId ? String(body.googlePlaceId) : undefined
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
