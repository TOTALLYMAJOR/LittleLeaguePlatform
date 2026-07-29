import { NextResponse } from "next/server";
import { recordFamilyReplayEngagement } from "@/lib/supabase/family-replays";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const operations = new Set(["viewed", "activity_completed", "saved"]);

export async function POST(request: Request, context: { params: Promise<{ replayId: string }> }) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const operation = body && typeof body === "object" ? String(body.operation ?? "") : "";
  if (!operations.has(operation)) {
    return NextResponse.json({ ok: false, message: "Choose a supported Parent Replay action." }, { status: 400 });
  }
  const { replayId } = await context.params;
  const result = await recordFamilyReplayEngagement({
    replayId,
    parentUserId: auth.user.id,
    operation: operation as "viewed" | "activity_completed" | "saved"
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
