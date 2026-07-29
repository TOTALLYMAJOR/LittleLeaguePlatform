import { NextResponse } from "next/server";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { acceptTransportationAssignment } from "@/lib/supabase/transportation";

export async function POST(request: Request, context: { params: Promise<{ assignmentId: string }> }) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const expectedScheduleVersion = Number(body?.expectedScheduleVersion);
  if (!Number.isInteger(expectedScheduleVersion) || expectedScheduleVersion < 1) {
    return NextResponse.json({ ok: false, message: "Current event version is required." }, { status: 400 });
  }
  const { assignmentId } = await context.params;
  const result = await acceptTransportationAssignment({
    assignmentId,
    actorUserId: auth.user.id,
    expectedScheduleVersion
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
