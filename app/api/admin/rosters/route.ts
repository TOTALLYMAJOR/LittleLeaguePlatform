import { NextResponse } from "next/server";
import { saveRosterPlayer } from "@/lib/supabase/team-management";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const rosterStatuses = new Set(["active", "inactive", "archived"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Roster body is required." }, { status: 400 });
  }

  const rosterStatus = String((body as { rosterStatus?: unknown }).rosterStatus ?? "active");
  if (!rosterStatuses.has(rosterStatus)) {
    return NextResponse.json({ ok: false, message: "Unsupported roster status." }, { status: 400 });
  }

  const result = await saveRosterPlayer({
    organizationId: String((body as { organizationId?: unknown }).organizationId ?? ""),
    actorUserId: auth.user.id,
    playerId: (body as { playerId?: unknown }).playerId ? String((body as { playerId?: unknown }).playerId) : undefined,
    teamId: String((body as { teamId?: unknown }).teamId ?? ""),
    seasonId: String((body as { seasonId?: unknown }).seasonId ?? ""),
    firstName: String((body as { firstName?: unknown }).firstName ?? ""),
    lastInitial: String((body as { lastInitial?: unknown }).lastInitial ?? ""),
    jersey: (body as { jersey?: unknown }).jersey ? String((body as { jersey?: unknown }).jersey) : undefined,
    rosterStatus: rosterStatus as "active" | "inactive" | "archived"
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
