import { NextResponse } from "next/server";
import { updateParentRsvp } from "@/lib/supabase/operations";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const responses = new Set(["going", "not_going", "maybe", "cancelled"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "RSVP body is required." }, { status: 400 });
  }

  const response = String(body.response ?? "");
  if (!responses.has(response)) {
    return NextResponse.json({ ok: false, message: "Unsupported RSVP response." }, { status: 400 });
  }
  const clientActionId = request.headers.get("idempotency-key")?.trim() ?? "";
  const expectedLockVersion = Number(body.expectedLockVersion);
  const expectedScheduleVersion = Number(body.expectedScheduleVersion);
  if (!clientActionId || !Number.isInteger(expectedLockVersion) || expectedLockVersion < 0
    || !Number.isInteger(expectedScheduleVersion) || expectedScheduleVersion < 1) {
    return NextResponse.json({
      ok: false,
      message: "RSVP requires an action receipt and current record versions."
    }, { status: 400 });
  }

  const result = await updateParentRsvp({
    eventId: String(body.eventId ?? ""),
    playerId: String(body.playerId ?? ""),
    parentUserId: auth.user.id,
    response: response as "going" | "not_going" | "maybe" | "cancelled",
    note: body.note ? String(body.note) : undefined,
    expectedLockVersion,
    expectedScheduleVersion,
    clientActionId,
    ...(request.headers.get("x-leaguepilot-offline-replay") === "true"
      ? { offlineReplay: true }
      : {})
  });

  const status = result.ok
    ? 200
    : result.code === "schedule_changed" || result.code === "guardian_conflict"
      ? 409
      : 400;
  return NextResponse.json(result, { status });
}
