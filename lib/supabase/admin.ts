import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseAdminEnv } from "./env";

export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = getSupabaseAdminEnv();
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
