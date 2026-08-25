import { NextResponse } from "next/server";
import { requireActiveTeamMemberOrOrgAdmin } from "@/lib/supabase/access-control";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

  // Calendar contents are team-private: only an active member of this team or
  // an organization admin may export them. Without this check any signed-in
  // account could pull any team's schedule by guessing a team id.
  let db;
  try {
    db = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Calendar export is unavailable until Supabase is configured." },
      { status: 503 }
    );
  }
  const access = await requireActiveTeamMemberOrOrgAdmin({
    db,
    teamId,
    userId: auth.user.id,
    action: "Calendar export"
  });
  if (!access.ok) {
    return NextResponse.json({ ok: false, message: access.message }, { status: 403 });
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
