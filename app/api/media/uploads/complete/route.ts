import { NextResponse } from "next/server";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { completePrivateMediaUpload } from "@/lib/supabase/private-media";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, message: "Media item is required." }, { status: 400 });
  const result = await completePrivateMediaUpload({
    mediaItemId: String(body.mediaItemId ?? ""),
    actorUserId: auth.user.id
  });
  return NextResponse.json(result, { status: result.ok ? 200 : result.code === "feature_disabled" ? 503 : 400 });
}
