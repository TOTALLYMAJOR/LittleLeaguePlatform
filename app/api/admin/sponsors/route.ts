import { NextResponse } from "next/server";
import { saveSponsor } from "@/lib/supabase/operations";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const levels = new Set(["league", "team"]);
const statuses = new Set(["pending", "active", "expired"]);
const placementKeys = new Set(["team_portal", "weekly_digest", "storybook", "registration", "field_map"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Sponsor body is required." }, { status: 400 });
  }

  const level = String(body.level ?? "");
  const status = String(body.status ?? "");
  const placementKey = body.placementKey ? String(body.placementKey) : undefined;
  if (!levels.has(level) || !statuses.has(status) || (placementKey && !placementKeys.has(placementKey))) {
    return NextResponse.json({ ok: false, message: "Unsupported sponsor level, status, or placement." }, { status: 400 });
  }

  const result = await saveSponsor({
    organizationId: String(body.organizationId ?? ""),
    actorUserId: auth.user.id,
    sponsorId: body.sponsorId ? String(body.sponsorId) : undefined,
    name: String(body.name ?? ""),
    level: level as "league" | "team",
    teamId: body.teamId ? String(body.teamId) : undefined,
    url: String(body.url ?? ""),
    status: status as "pending" | "active" | "expired",
    placementKey: placementKey as "team_portal" | "weekly_digest" | "storybook" | "registration" | "field_map" | undefined,
    logoUrl: body.logoUrl ? String(body.logoUrl) : undefined
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
