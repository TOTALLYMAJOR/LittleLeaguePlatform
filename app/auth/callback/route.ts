import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnTo = url.searchParams.get("returnTo") ?? "";
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "";
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(new URL("/auth?error=missing_oauth_code", origin));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/auth?error=oauth_exchange_failed", origin));
    }
  } catch {
    return NextResponse.redirect(new URL("/auth?error=oauth_exchange_failed", origin));
  }

  return NextResponse.redirect(new URL(safeReturnTo || "/auth?oauth=complete", origin));
}
