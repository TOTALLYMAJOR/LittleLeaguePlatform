import { NextResponse } from "next/server";
import { updateTenantThemeDefaults } from "@/lib/supabase/team-branding";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import type { ProgramThemeKey } from "@/lib/domain";

const themeKeys = new Set(["soccer", "football", "baseball", "scouts", "golf", "tennis", "swim", "generic"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Theme defaults body is required." }, { status: 400 });
  }

  const themeKey = String(body.themeKey ?? "");
  if (!themeKeys.has(themeKey)) {
    return NextResponse.json({ ok: false, message: "Unsupported tenant theme default." }, { status: 400 });
  }

  const result = await updateTenantThemeDefaults({
    organizationId: String(body.organizationId ?? ""),
    actorUserId: auth.user.id,
    themeKey: themeKey as ProgramThemeKey,
    mascot: String(body.mascot ?? ""),
    primaryColor: String(body.primaryColor ?? ""),
    secondaryColor: String(body.secondaryColor ?? "")
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
