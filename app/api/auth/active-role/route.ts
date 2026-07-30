import { NextResponse } from "next/server";
import { getServerShellAccess } from "@/lib/supabase/shell-access";
import type { ProductRole } from "@/lib/navigation/route-topology";

const roleHome: Record<ProductRole, string> = {
  parent: "/parent",
  coach: "/coach",
  admin: "/admin"
};

export async function POST(request: Request) {
  const access = await getServerShellAccess();
  if (!access.signedIn) {
    return NextResponse.json({ ok: false, message: "Sign in before choosing an active role." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { role?: unknown } | null;
  const role = body?.role;
  if (role !== "parent" && role !== "coach" && role !== "admin") {
    return NextResponse.json({ ok: false, message: "Choose a supported role." }, { status: 400 });
  }

  const hasRole = role === "parent"
    ? access.canParent
    : role === "coach"
      ? access.canCoach
      : access.canAdmin;
  const hasContext = access.contexts?.some((context) => context.role === role) ?? false;
  if (!hasRole || !hasContext) {
    return NextResponse.json({ ok: false, message: "This account does not have that active role." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true, href: roleHome[role] });
  response.cookies.set("leaguepilot-active-role", role, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return response;
}
