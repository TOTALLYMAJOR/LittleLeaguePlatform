import { NextResponse } from "next/server";
import { commitSeasonLaunchRoster } from "@/lib/supabase/season-launch";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Season launch approval body is required." }, { status: 400 });
  }
  const result = await commitSeasonLaunchRoster({
    rosterImportId: String((body as { rosterImportId?: unknown }).rosterImportId ?? ""),
    actorUserId: auth.user.id,
    confirmWarnings: (body as { confirmWarnings?: unknown }).confirmWarnings === true
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
