import { NextResponse } from "next/server";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { completeFamilyFirstSignIn } from "@/lib/supabase/family-onboarding";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedRouteUser(request);
  if (!auth.ok || !auth.user) {
    return NextResponse.json({ ok: false, message: auth.message }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Preference details are required." }, { status: 400 });
  }
  const result = await completeFamilyFirstSignIn({
    userId: auth.user.id,
    language: String(body.language ?? ""),
    criticalChannel: String(body.criticalChannel ?? "") as "push" | "email" | "sms",
    routineChannel: String(body.routineChannel ?? "") as "push" | "email" | "sms",
    quietHoursStart: String(body.quietHoursStart ?? ""),
    quietHoursEnd: String(body.quietHoursEnd ?? ""),
    timezone: String(body.timezone ?? ""),
    translationEnabled: body.translationEnabled === true,
    sharedDevicePreviews: body.sharedDevicePreviews === true
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
