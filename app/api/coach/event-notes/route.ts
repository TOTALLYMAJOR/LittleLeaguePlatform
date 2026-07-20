import { NextResponse } from "next/server";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { saveCoachEventNote } from "@/lib/supabase/field-mode";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const clientActionId = request.headers.get("idempotency-key")?.trim() ?? "";
  const expectedScheduleVersion = Number(body?.expectedScheduleVersion);
  if (!body || !clientActionId || !Number.isInteger(expectedScheduleVersion) || expectedScheduleVersion < 1) {
    return NextResponse.json({ ok: false, message: "Coach note input or schedule version is incomplete." }, { status: 400 });
  }
  const result = await saveCoachEventNote({
    eventId: String(body.eventId ?? ""),
    actorUserId: auth.user.id,
    body: String(body.body ?? ""),
    expectedScheduleVersion,
    clientActionId,
    offlineReplay: request.headers.get("x-leaguepilot-offline-replay") === "true"
  });
  const code = "code" in result ? String(result.code ?? "") : "";
  return NextResponse.json(result, {
    status: result.ok ? 201 : code === "schedule_changed" ? 409 : 400
  });
}
