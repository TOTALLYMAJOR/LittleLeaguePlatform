import { NextResponse } from "next/server";
import { submitCoachDrillVideoReference } from "@/lib/supabase/drill-videos";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Drill video submission body is required." }, { status: 400 });
  }

  const result = await submitCoachDrillVideoReference({
    actorUserId: auth.user.id,
    teamId: String(body.teamId ?? ""),
    provider: body.provider ? String(body.provider) : "youtube",
    url: String(body.url ?? ""),
    sport: String(body.sport ?? ""),
    skillCategory: String(body.skillCategory ?? ""),
    ageBand: String(body.ageBand ?? ""),
    difficulty: String(body.difficulty ?? ""),
    coachInstructions: body.coachInstructions ? String(body.coachInstructions) : undefined,
    safetyNotes: body.safetyNotes ? String(body.safetyNotes) : undefined
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
