import { NextResponse } from "next/server";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { requestTransportation, type TransportationDirection } from "@/lib/supabase/transportation";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, message: "Transportation request details are required." }, { status: 400 });
  }
  const direction = String(body.direction ?? "");
  const expectedScheduleVersion = Number(body.expectedScheduleVersion);
  if (!["outbound", "return"].includes(direction) || !Number.isInteger(expectedScheduleVersion) || expectedScheduleVersion < 1) {
    return NextResponse.json({ ok: false, message: "Choose a direction and current event version." }, { status: 400 });
  }
  const result = await requestTransportation({
    eventId: String(body.eventId ?? ""),
    playerId: String(body.playerId ?? ""),
    actorUserId: auth.user.id,
    direction: direction as TransportationDirection,
    expectedScheduleVersion
  });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
