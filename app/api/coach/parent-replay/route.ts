import { NextResponse } from "next/server";
import { saveParentReplay } from "@/lib/supabase/operations";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import type { PracticeFocusArea } from "@/lib/domain";

const focusAreas = new Set([
  "catching",
  "throwing",
  "teamwork",
  "spacing",
  "hitting",
  "base_running",
  "listening",
  "sportsmanship"
]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Parent Replay body is required." }, { status: 400 });
  }

  const requestedFocusAreas = Array.isArray(body.focusAreas) ? body.focusAreas.map(String) : [];
  if (requestedFocusAreas.length < 2 || requestedFocusAreas.length > 3 || requestedFocusAreas.some((area: string) => !focusAreas.has(area))) {
    return NextResponse.json({ ok: false, message: "Parent Replay requires 2-3 supported focus areas." }, { status: 400 });
  }
  if (!body.draft || typeof body.draft !== "object") {
    return NextResponse.json({ ok: false, message: "Parent Replay draft is required." }, { status: 400 });
  }

  const result = await saveParentReplay({
    teamId: String(body.teamId ?? ""),
    actorUserId: auth.user.id,
    focusAreas: requestedFocusAreas as PracticeFocusArea[],
    draft: body.draft
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
