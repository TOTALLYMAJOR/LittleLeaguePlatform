import { NextResponse } from "next/server";
import {
  applyGameDayResolution,
  type GameDayDecision
} from "@/lib/supabase/game-day-resolution";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const decisions = new Set(["monitor", "confirm_on_time", "delay", "cancel"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Game-day resolution body is required." }, { status: 400 });
  }
  const decision = String(body.decision ?? "");
  if (!decisions.has(decision)) {
    return NextResponse.json({ ok: false, message: "Unsupported game-day resolution." }, { status: 400 });
  }
  const result = await applyGameDayResolution({
    actorUserId: auth.user.id,
    eventId: String(body.eventId ?? ""),
    decision: decision as GameDayDecision,
    reason: String(body.reason ?? ""),
    startsAt: body.startsAt ? String(body.startsAt) : undefined,
    idempotencyKey: String(request.headers.get("Idempotency-Key") ?? body.idempotencyKey ?? "")
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
