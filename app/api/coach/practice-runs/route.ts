import { NextResponse } from "next/server";
import {
  advancePracticeRun,
  savePracticeRunPlan,
  type PracticeRunObservations,
  type PracticeRunPlan
} from "@/lib/supabase/practice-runs";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Practice-run body is required." }, { status: 400 });
  }
  const action = String(body.action ?? "plan");
  const result = action === "plan"
    ? await savePracticeRunPlan({
      actorUserId: auth.user.id,
      teamId: String(body.teamId ?? ""),
      eventId: body.eventId ? String(body.eventId) : undefined,
      plan: body.plan as PracticeRunPlan,
      idempotencyKey: String(request.headers.get("Idempotency-Key") ?? body.idempotencyKey ?? "")
    })
    : action === "start" || action === "complete"
      ? await advancePracticeRun({
        actorUserId: auth.user.id,
        receiptId: String(body.receiptId ?? ""),
        action,
        observations: body.observations as PracticeRunObservations | undefined
      })
      : { ok: false, message: "Unsupported practice-run action." };
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
