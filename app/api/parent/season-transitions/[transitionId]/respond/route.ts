import { NextResponse } from "next/server";
import { respondToSeasonTransition } from "@/lib/supabase/season-transitions";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request, context: { params: Promise<{ transitionId: string }> }) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  const body = await request.json().catch(() => null);
  const decision = body && typeof body === "object" ? String(body.decision ?? "") : "";
  if (decision !== "accepted" && decision !== "declined") {
    return NextResponse.json({ ok: false, message: "Choose accept or decline." }, { status: 400 });
  }
  const { transitionId } = await context.params;
  const expectedLockVersion = Number(body.expectedLockVersion ?? 0);
  if (!transitionId || !Number.isInteger(expectedLockVersion) || expectedLockVersion < 1) {
    return NextResponse.json({ ok: false, message: "This review changed. Refresh before responding." }, { status: 400 });
  }
  const result = await respondToSeasonTransition({
    transitionId,
    actorUserId: auth.user.id,
    decision,
    note: String(body.note ?? ""),
    expectedLockVersion
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
