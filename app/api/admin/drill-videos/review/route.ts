import { NextResponse } from "next/server";
import { reviewDrillVideo } from "@/lib/supabase/drill-videos";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const statuses = new Set(["approved", "rejected", "retired"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Drill video review body is required." }, { status: 400 });
  }

  const status = String(body.status ?? "");
  if (!statuses.has(status)) {
    return NextResponse.json({ ok: false, message: "Unsupported drill video review status." }, { status: 400 });
  }

  const result = await reviewDrillVideo({
    drillVideoId: String(body.drillVideoId ?? ""),
    reviewerUserId: auth.user.id,
    status: status as "approved" | "rejected" | "retired",
    reviewNotes: body.reviewNotes ? String(body.reviewNotes) : undefined
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
