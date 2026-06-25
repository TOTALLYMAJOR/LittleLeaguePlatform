import { NextResponse } from "next/server";
import type { RosterImportAnalysis } from "@/lib/domain";
import { recordRosterImportAudit } from "@/lib/supabase/roster-imports";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Roster import audit body is required." }, { status: 400 });
  }

  const analysis = (body as { analysis?: unknown }).analysis as RosterImportAnalysis | undefined;
  if (!analysis || !Array.isArray(analysis.rows)) {
    return NextResponse.json({ ok: false, message: "Roster import analysis is required." }, { status: 400 });
  }

  const result = await recordRosterImportAudit({
    organizationId: String((body as { organizationId?: unknown }).organizationId ?? ""),
    seasonId: String((body as { seasonId?: unknown }).seasonId ?? ""),
    actorUserId: auth.user.id,
    filename: (body as { filename?: unknown }).filename ? String((body as { filename?: unknown }).filename) : undefined,
    analysis
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
