import { NextResponse } from "next/server";
import type { ProgramThemeKey } from "@/lib/domain";
import { saveAdminTeam } from "@/lib/supabase/team-management";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const themeKeys = new Set(["soccer", "football", "baseball", "scouts", "golf", "tennis", "swim", "generic"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Team setup body is required." }, { status: 400 });
  }

  const themeKey = String((body as { themeKey?: unknown }).themeKey ?? "baseball");
  if (!themeKeys.has(themeKey)) {
    return NextResponse.json({ ok: false, message: "Unsupported team theme." }, { status: 400 });
  }

  const result = await saveAdminTeam({
    organizationId: String((body as { organizationId?: unknown }).organizationId ?? ""),
    actorUserId: auth.user.id,
    teamId: (body as { teamId?: unknown }).teamId ? String((body as { teamId?: unknown }).teamId) : undefined,
    seasonId: String((body as { seasonId?: unknown }).seasonId ?? ""),
    name: String((body as { name?: unknown }).name ?? ""),
    division: String((body as { division?: unknown }).division ?? ""),
    mascot: String((body as { mascot?: unknown }).mascot ?? ""),
    themeKey: themeKey as ProgramThemeKey,
    primaryColor: String((body as { primaryColor?: unknown }).primaryColor ?? "#1d4ed8"),
    secondaryColor: String((body as { secondaryColor?: unknown }).secondaryColor ?? "#f97316"),
    coachUserId: (body as { coachUserId?: unknown }).coachUserId ? String((body as { coachUserId?: unknown }).coachUserId) : undefined,
    status: (body as { status?: unknown }).status === "archived" ? "archived" : "active"
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
