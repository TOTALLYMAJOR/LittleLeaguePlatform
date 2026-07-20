import { NextResponse } from "next/server";
import { rollbackSeasonLaunchRoster } from "@/lib/supabase/season-launch";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Season launch rollback body is required." }, { status: 400 });
  }
  const result = await rollbackSeasonLaunchRoster({
    rosterImportId: String((body as { rosterImportId?: unknown }).rosterImportId ?? ""),
    actorUserId: auth.user.id,
    reason: String((body as { reason?: unknown }).reason ?? "")
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
