const missingEnvMessage = (name: string) => `${name} is required before Supabase integration can run.`;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(missingEnvMessage(name));
  }
  return value;
}

export function getSupabaseBrowserEnv() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  };
}

export function getSupabaseAdminEnv() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  };
}
