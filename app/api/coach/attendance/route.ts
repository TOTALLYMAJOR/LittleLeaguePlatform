import { NextResponse } from "next/server";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { saveCoachAttendance } from "@/lib/supabase/field-mode";

const attendanceValues = new Set(["present", "absent", "late"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const clientActionId = request.headers.get("idempotency-key")?.trim() ?? "";
  const attendanceValue = String(body?.attendanceValue ?? "");
  const expectedLockVersion = Number(body?.expectedLockVersion);
  const expectedScheduleVersion = Number(body?.expectedScheduleVersion);
  if (!body || !attendanceValues.has(attendanceValue) || !clientActionId
    || !Number.isInteger(expectedLockVersion) || expectedLockVersion < 0
    || !Number.isInteger(expectedScheduleVersion) || expectedScheduleVersion < 1) {
    return NextResponse.json({ ok: false, message: "Attendance input or record versions are incomplete." }, { status: 400 });
  }
  const result = await saveCoachAttendance({
    eventId: String(body.eventId ?? ""),
    playerId: String(body.playerId ?? ""),
    actorUserId: auth.user.id,
    attendanceValue: attendanceValue as "present" | "absent" | "late",
    expectedLockVersion,
    expectedScheduleVersion,
    clientActionId,
    offlineReplay: request.headers.get("x-leaguepilot-offline-replay") === "true"
  });
  const code = "code" in result ? String(result.code ?? "") : "";
  return NextResponse.json(result, {
    status: result.ok ? 200 : code === "schedule_changed" || code === "coach_conflict" ? 409 : 400
  });
}
