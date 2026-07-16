import { NextResponse } from "next/server";
import { createMediaUploadIntent } from "@/lib/supabase/media-uploads";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Media upload intent body is required." }, { status: 400 });
  }

  const result = await createMediaUploadIntent({
    teamId: String(body.teamId ?? ""),
    actorUserId: auth.user.id,
    title: String(body.title ?? ""),
    fileName: String(body.fileName ?? ""),
    mimeType: String(body.mimeType ?? ""),
    byteSize: Number(body.byteSize ?? 0),
    visibility: body.visibility ? String(body.visibility) as "team" | "organization" : undefined
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
