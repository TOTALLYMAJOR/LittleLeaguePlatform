import { NextResponse } from "next/server";
import { moderateMediaItem } from "@/lib/supabase/operations";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const statuses = new Set(["approved", "hidden", "rejected", "removed"]);
const visibilities = new Set(["team", "organization"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Media moderation body is required." }, { status: 400 });
  }

  const status = String(body.status ?? "");
  const visibility = body.visibility ? String(body.visibility) : undefined;
  if (!statuses.has(status) || (visibility && !visibilities.has(visibility))) {
    return NextResponse.json({ ok: false, message: "Unsupported media moderation status or visibility." }, { status: 400 });
  }

  const result = await moderateMediaItem({
    mediaItemId: String(body.mediaItemId ?? ""),
    reviewerUserId: auth.user.id,
    status: status as "approved" | "hidden" | "rejected" | "removed",
    visibility: visibility as "team" | "organization" | undefined,
    reason: body.reason ? String(body.reason) : undefined
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
