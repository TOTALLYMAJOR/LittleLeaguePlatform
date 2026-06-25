import { NextResponse } from "next/server";
import { repairGuardianLink } from "@/lib/supabase/guardian-links";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const relationships = new Set(["mother", "father", "guardian", "other"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Guardian repair body is required." }, { status: 400 });
  }

  const relationship = String((body as { relationship?: unknown }).relationship ?? "guardian");
  if (!relationships.has(relationship)) {
    return NextResponse.json({ ok: false, message: "Unsupported guardian relationship." }, { status: 400 });
  }

  const result = await repairGuardianLink({
    organizationId: String((body as { organizationId?: unknown }).organizationId ?? ""),
    actorUserId: auth.user.id,
    playerId: String((body as { playerId?: unknown }).playerId ?? ""),
    parentUserId: String((body as { parentUserId?: unknown }).parentUserId ?? ""),
    relationship: relationship as "mother" | "father" | "guardian" | "other"
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
