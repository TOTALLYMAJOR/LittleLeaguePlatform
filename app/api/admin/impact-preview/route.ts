import { NextResponse } from "next/server";
import { createSeasonArchiveImpactPreview } from "@/lib/supabase/impact-preview";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || body.targetType !== "season_archive") {
    return NextResponse.json({ ok: false, message: "A supported high-impact target is required." }, { status: 400 });
  }
  const result = await createSeasonArchiveImpactPreview({
    organizationId: String(body.organizationId ?? ""),
    seasonId: String(body.seasonId ?? ""),
    actorUserId: auth.user.id,
    reason: String(body.reason ?? ""),
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
