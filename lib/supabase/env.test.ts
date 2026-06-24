import { describe, expect, it } from "vitest";
import { assertSupabaseAnonKey, supabaseJwtRole } from "./env";

function jwtWithRole(role: string) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ role })).toString("base64url");
  return `${header}.${payload}.signature`;
}

describe("Supabase env guards", () => {
  it("decodes Supabase JWT roles", () => {
    expect(supabaseJwtRole(jwtWithRole("anon"))).toBe("anon");
    expect(supabaseJwtRole(jwtWithRole("service_role"))).toBe("service_role");
  });

  it("rejects service role keys in public anon configuration", () => {
    expect(() => assertSupabaseAnonKey("NEXT_PUBLIC_SUPABASE_ANON_KEY", jwtWithRole("service_role")))
      .toThrow("must be the Supabase anon key");
    expect(() => assertSupabaseAnonKey("NEXT_PUBLIC_SUPABASE_ANON_KEY", jwtWithRole("anon"))).not.toThrow();
  });
});
