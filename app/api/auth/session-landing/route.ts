import { NextResponse } from "next/server";
import { getServerShellAccess } from "@/lib/supabase/shell-access";
import { getFamilyOnboardingStatus } from "@/lib/supabase/family-onboarding";

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
    const onboarding = await getFamilyOnboardingStatus(access.userId ?? "");
    if (onboarding.available && !onboarding.completed) {
      return NextResponse.json({ ok: true, href: "/parent/setup" });
    }
    return NextResponse.json({ ok: true, href: "/parent" });
  }

  return NextResponse.json({
    ok: true,
    href: "/account",
    message: "Account is signed in but still waiting on active role access."
  });
}
