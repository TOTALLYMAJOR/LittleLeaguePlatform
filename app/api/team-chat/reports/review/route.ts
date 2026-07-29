import { NextResponse } from "next/server";
import type { TeamChatReportStatus } from "@/lib/supabase/team-chat";
import { reviewSupabaseTeamChatReport } from "@/lib/supabase/team-chat";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const statuses = new Set(["reviewed", "dismissed", "action_taken"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Team Chat report review body is required." }, { status: 400 });
  }

  const status = String(body.status ?? "");
  if (!statuses.has(status)) {
    return NextResponse.json({ ok: false, message: "Unsupported Team Chat report review status." }, { status: 400 });
  }

  const result = await reviewSupabaseTeamChatReport({
    reportId: String(body.reportId ?? ""),
    reviewerUserId: auth.user.id,
    status: status as Exclude<TeamChatReportStatus, "open">,
    reason: String(body.reason ?? "")
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
