import { NextResponse } from "next/server";
import { saveTeamLogoAsset } from "@/lib/supabase/team-logos";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Team logo body is required." }, { status: 400 });
  }

  const result = await saveTeamLogoAsset({
    organizationId: String((body as { organizationId?: unknown }).organizationId ?? ""),
    actorUserId: auth.user.id,
    teamId: (body as { teamId?: unknown }).teamId ? String((body as { teamId?: unknown }).teamId) : undefined,
    url: String((body as { url?: unknown }).url ?? ""),
    policyNotes: (body as { policyNotes?: unknown }).policyNotes ? String((body as { policyNotes?: unknown }).policyNotes) : undefined
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
