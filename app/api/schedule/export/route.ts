import { NextResponse } from "next/server";
import { exportScheduleIcs, listScheduleOperationsData } from "@/lib/supabase/schedule-management";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { requireActiveTeamMemberOrOrgAdmin } from "@/lib/supabase/access-control";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

  const access = await requireActiveTeamMemberOrOrgAdmin({
    db: createSupabaseAdminClient(),
    teamId,
    userId: auth.user.id,
    action: "export this team calendar"
  });
  if (!access.ok || !access.team) {
    return NextResponse.json({ ok: false, message: access.message }, { status: 403 });
  }

  const data = await listScheduleOperationsData({
    organizationIds: [access.team.organization_id]
  });
  const ics = exportScheduleIcs(data.events, teamId);

  return new Response(ics, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${teamId}-schedule.ics"`
    }
  });
}
