import { NextResponse } from "next/server";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { initiatePrivateMediaUpload } from "@/lib/supabase/private-media";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, message: "Media upload metadata is required." }, { status: 400 });
  const result = await initiatePrivateMediaUpload({
    teamId: String(body.teamId ?? ""),
    actorUserId: auth.user.id,
    title: String(body.title ?? ""),
    mimeType: String(body.mimeType ?? ""),
    sizeBytes: Number(body.sizeBytes),
    sha256: String(body.sha256 ?? "")
  });
  return NextResponse.json(result, { status: result.ok ? 201 : result.code === "feature_disabled" ? 503 : 400 });
}
