import { NextResponse } from "next/server";
import { finalizeMediaUpload } from "@/lib/supabase/media-uploads";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Media upload finalize body is required." }, { status: 400 });
  }

  const result = await finalizeMediaUpload({
    mediaItemId: String(body.mediaItemId ?? ""),
    actorUserId: auth.user.id,
    storagePath: String(body.storagePath ?? "")
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
