import { NextResponse } from "next/server";
import { getServerShellAccess } from "@/lib/supabase/shell-access";

export async function GET() {
  const access = await getServerShellAccess();

  if (!access.signedIn) {
    return NextResponse.json({ ok: false, href: "/auth", message: "Sign in before choosing a dashboard." }, { status: 401 });
  }

  if (access.canAdmin) {
    return NextResponse.json({ ok: true, href: "/admin" });
  }
  if (access.canCoach) {
    return NextResponse.json({ ok: true, href: "/coach" });
  }
  if (access.canParent) {
    return NextResponse.json({ ok: true, href: "/parent" });
  }

  return NextResponse.json({
    ok: true,
    href: "/account",
    message: "Account is signed in but still waiting on active role access."
  });
}
