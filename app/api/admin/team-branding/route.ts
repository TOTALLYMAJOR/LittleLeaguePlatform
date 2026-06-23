import { NextResponse } from "next/server";
import type { ProgramThemeKey } from "@/lib/domain";
import { updateTeamBranding } from "@/lib/supabase/team-branding";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";

const themeKeys = new Set([
  "soccer",
  "football",
  "baseball",
  "scouts",
  "golf",
  "tennis",
  "swim",
  "generic"
]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Team branding request body is required." }, { status: 400 });
  }

  const themeKey = String(body.themeKey ?? "");
  if (!themeKeys.has(themeKey)) {
    return NextResponse.json({ ok: false, message: "Program theme is not supported." }, { status: 400 });
  }

  const result = await updateTeamBranding({
    teamId: String(body.teamId ?? ""),
    actorUserId: auth.user.id,
    mascot: String(body.mascot ?? ""),
    primaryColor: String(body.primaryColor ?? ""),
    secondaryColor: String(body.secondaryColor ?? ""),
    themeKey: themeKey as ProgramThemeKey
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
