import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const provider = url.searchParams.get("provider");
  const rawErrorDescription = url.searchParams.get("error_description");
  const errorDescription = rawErrorDescription?.slice(0, 160);
  const returnTo = url.searchParams.get("returnTo") ?? "";
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "";
  const origin = url.origin;

  if (!code) {
    const errorParams = new URLSearchParams({ error: error ?? "missing_oauth_code" });
    if (provider) errorParams.set("provider", provider);
    if (errorDescription) errorParams.set("error_description", errorDescription);
    return NextResponse.redirect(new URL(`/auth?${errorParams.toString()}`, origin));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const errorParams = new URLSearchParams({ error: "oauth_exchange_failed" });
      if (provider) errorParams.set("provider", provider);
      return NextResponse.redirect(new URL(`/auth?${errorParams.toString()}`, origin));
    }
  } catch {
    const errorParams = new URLSearchParams({ error: "oauth_exchange_failed" });
    if (provider) errorParams.set("provider", provider);
    return NextResponse.redirect(new URL(`/auth?${errorParams.toString()}`, origin));
  }

  return NextResponse.redirect(new URL(safeReturnTo || "/auth?oauth=complete", origin));
}
