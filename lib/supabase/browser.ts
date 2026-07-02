import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseAnonKey, supabaseJwtRole } from "./env";
import type { Database } from "./database.types";

export interface SupabaseBrowserConfigStatus {
  ok: boolean;
  message?: string;
}

export function getSupabaseBrowserConfigStatus(): SupabaseBrowserConfigStatus {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return {
      ok: false,
      message: "Supabase Auth is not configured for this app environment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the app."
    };
  }

  if (supabaseJwtRole(anonKey) === "service_role") {
    return {
      ok: false,
      message: "Supabase Auth is using a service-role key in the public browser config. Replace NEXT_PUBLIC_SUPABASE_ANON_KEY with the anon key."
    };
  }

  return { ok: true };
}

export function getSupabaseAuthClientErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("NEXT_PUBLIC_SUPABASE_URL") || message.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
    return getSupabaseBrowserConfigStatus().message ?? message;
  }

  if (message.toLowerCase().includes("failed to fetch") || message.toLowerCase().includes("network")) {
    return "Supabase Auth could not be reached from this browser. Check the Supabase project URL, network access, and allowed auth origin.";
  }

  return message || "Supabase Auth could not complete the request from this app environment.";
}

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required before browser Supabase integration can run.");
  }
  assertSupabaseAnonKey("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);
  return createBrowserClient<Database>(url, anonKey);
}
