import { NextResponse } from "next/server";
import { exportScheduleIcs, listScheduleOperationsData } from "@/lib/supabase/schedule-management";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const url = new URL(request.url);
  const teamId = url.searchParams.get("teamId") ?? "";
  if (!teamId) {
    return NextResponse.json({ ok: false, message: "Calendar export requires a team." }, { status: 400 });
  }

  const data = await listScheduleOperationsData();
  const ics = exportScheduleIcs(data.events, teamId);

  return new Response(ics, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${teamId}-schedule.ics"`
    }
  });
}
