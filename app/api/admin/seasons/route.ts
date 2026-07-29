import { NextResponse } from "next/server";
import { saveAdminSeason } from "@/lib/supabase/team-management";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Season setup body is required." }, { status: 400 });
  }

  const result = await saveAdminSeason({
    organizationId: String((body as { organizationId?: unknown }).organizationId ?? ""),
    actorUserId: auth.user.id,
    seasonId: (body as { seasonId?: unknown }).seasonId ? String((body as { seasonId?: unknown }).seasonId) : undefined,
    name: String((body as { name?: unknown }).name ?? ""),
    startsAt: String((body as { startsAt?: unknown }).startsAt ?? ""),
    endsAt: String((body as { endsAt?: unknown }).endsAt ?? ""),
    status: (body as { status?: unknown }).status === "archived" ? "archived" : "active",
    ...((body as { archiveReason?: unknown }).archiveReason
      ? { archiveReason: String((body as { archiveReason?: unknown }).archiveReason) }
      : {}),
    ...((body as { previewHash?: unknown }).previewHash
      ? { previewHash: String((body as { previewHash?: unknown }).previewHash) }
      : {}),
    ...((body as { previewExpiresAt?: unknown }).previewExpiresAt
      ? { previewExpiresAt: String((body as { previewExpiresAt?: unknown }).previewExpiresAt) }
      : {})
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
