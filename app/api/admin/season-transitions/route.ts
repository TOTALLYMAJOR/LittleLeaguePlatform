import { NextResponse } from "next/server";
import {
  applySeasonTransition,
  closeSeasonTransition,
  proposeSeasonTransition,
  revertSeasonTransition
} from "@/lib/supabase/season-transitions";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Season-change details are required." }, { status: 400 });
  }
  const action = String(body.action ?? "");
  const expectedLockVersion = Number(body.expectedLockVersion ?? 0);
  if ((action === "apply" && (!String(body.transitionId ?? "") || !Number.isInteger(expectedLockVersion) || expectedLockVersion < 1))
    || (action === "propose" && (!String(body.sourcePlayerId ?? "") || !String(body.targetTeamId ?? "") || String(body.reason ?? "").trim().length < 10))
    || (action === "close" && (!String(body.transitionId ?? "") || !Number.isInteger(expectedLockVersion) || expectedLockVersion < 1 || String(body.reason ?? "").trim().length < 10))
    || (action === "revert" && (!String(body.transitionId ?? "") || String(body.reason ?? "").trim().length < 10))) {
    return NextResponse.json({ ok: false, message: "Complete the reviewed season-change details before continuing." }, { status: 400 });
  }
  const result = action === "propose"
    ? await proposeSeasonTransition({
      sourcePlayerId: String(body.sourcePlayerId ?? ""),
      targetTeamId: String(body.targetTeamId ?? ""),
      actorUserId: auth.user.id,
      reason: String(body.reason ?? ""),
      expiresAt: String(body.expiresAt ?? "")
    })
    : action === "apply"
      ? await applySeasonTransition({
        transitionId: String(body.transitionId ?? ""),
        actorUserId: auth.user.id,
        expectedLockVersion
      })
      : action === "close"
        ? await closeSeasonTransition({
          transitionId: String(body.transitionId ?? ""),
          actorUserId: auth.user.id,
          reason: String(body.reason ?? ""),
          expectedLockVersion
        })
      : action === "revert"
        ? await revertSeasonTransition({
          transitionId: String(body.transitionId ?? ""),
          actorUserId: auth.user.id,
          reason: String(body.reason ?? "")
        })
        : { ok: false, message: "Choose propose, apply, close, or correct." };
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
