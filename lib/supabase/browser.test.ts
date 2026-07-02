import { afterEach, describe, expect, it } from "vitest";
import { getSupabaseAuthClientErrorMessage, getSupabaseBrowserConfigStatus } from "./browser";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function jwtWithRole(role: string) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ role })).toString("base64url");
  return `${header}.${payload}.signature`;
}

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
});

describe("Supabase browser auth config", () => {
  it("explains missing public browser env before auth submit", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(getSupabaseBrowserConfigStatus()).toEqual({
      ok: false,
      message: "Supabase Auth is not configured for this app environment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the app."
    });
  });

  it("explains service-role keys in public browser config", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = jwtWithRole("service_role");

    expect(getSupabaseBrowserConfigStatus()).toEqual({
      ok: false,
      message: "Supabase Auth is using a service-role key in the public browser config. Replace NEXT_PUBLIC_SUPABASE_ANON_KEY with the anon key."
    });
  });

  it("turns fetch failures into actionable browser auth guidance", () => {
    expect(getSupabaseAuthClientErrorMessage(new Error("Failed to fetch"))).toBe(
      "Supabase Auth could not be reached from this browser. Check the Supabase project URL, network access, and allowed auth origin."
    );
  });
});
