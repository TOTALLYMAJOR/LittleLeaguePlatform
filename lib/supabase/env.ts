const missingEnvMessage = (name: string) => `${name} is required before Supabase integration can run.`;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(missingEnvMessage(name));
  }
  return value;
}

export function supabaseJwtRole(token: string): string | undefined {
  const [, payload] = token.split(".");
  if (!payload) return undefined;

  try {
    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
    const decoded = globalThis.atob(normalized);
    const parsed = JSON.parse(decoded) as { role?: string };
    return parsed.role;
  } catch {
    return undefined;
  }
}

export function assertSupabaseAnonKey(name: string, value: string) {
  if (supabaseJwtRole(value) === "service_role") {
    throw new Error(`${name} must be the Supabase anon key, not the service role key.`);
  }
}

export function getSupabaseBrowserEnv() {
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  assertSupabaseAnonKey("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey);

  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey
  };
}

export function getSupabaseAdminEnv() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  };
}
