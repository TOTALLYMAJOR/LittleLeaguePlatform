import { NextResponse } from "next/server";
import { assignDrillVideoToTeam } from "@/lib/supabase/drill-videos";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const usageContexts = new Set(["practice_plan", "practice_recap"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Drill video assignment body is required." }, { status: 400 });
  }

  const usageContext = body.usageContext ? String(body.usageContext) : "practice_plan";
  if (!usageContexts.has(usageContext)) {
    return NextResponse.json({ ok: false, message: "Unsupported drill video assignment context." }, { status: 400 });
  }

  const result = await assignDrillVideoToTeam({
    actorUserId: auth.user.id,
    drillVideoId: String(body.drillVideoId ?? ""),
    teamId: String(body.teamId ?? ""),
    eventId: body.eventId ? String(body.eventId) : undefined,
    usageContext: usageContext as "practice_plan" | "practice_recap",
    notes: body.notes ? String(body.notes) : undefined
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
