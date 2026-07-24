import { NextResponse } from "next/server";
import { requestAdditionalGuardian } from "@/lib/supabase/additional-guardians";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const relationships = new Set(["mother", "father", "guardian", "other"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Additional guardian details are required." }, { status: 400 });
  }
  const relationship = String((body as { relationship?: unknown }).relationship ?? "");
  if (!relationships.has(relationship)) {
    return NextResponse.json({ ok: false, message: "Choose a supported relationship." }, { status: 400 });
  }
  const result = await requestAdditionalGuardian({
    playerId: String((body as { playerId?: unknown }).playerId ?? ""),
    actorUserId: auth.user.id,
    email: String((body as { email?: unknown }).email ?? ""),
    relationship: relationship as "mother" | "father" | "guardian" | "other"
  });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
