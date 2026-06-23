import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getSupabaseBrowserEnv } from "./env";

export interface SupabaseServerUser {
  id: string;
  email?: string;
}

export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseBrowserEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write refreshed cookies.
        }
      }
    }
  });
}

function readAccessTokenFromSupabaseCookie(cookieValues: Array<{ name: string; value: string }>) {
  const authCookie = cookieValues.find((cookie) => (
    cookie.name.startsWith("sb-") &&
    cookie.name.includes("-auth-token")
  ));
  if (!authCookie) return null;

  try {
    const cookieValue = decodeURIComponent(authCookie.value);
    if (!cookieValue.startsWith("base64-")) return null;
    const decoded = Buffer.from(cookieValue.slice("base64-".length), "base64url").toString("utf8");
    const session = JSON.parse(decoded) as { access_token?: unknown };
    return typeof session.access_token === "string" ? session.access_token : null;
  } catch {
    return null;
  }
}

export async function getSupabaseServerUser(): Promise<SupabaseServerUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      return {
        id: data.user.id,
        email: data.user.email
      };
    }

    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const accessToken = readAccessTokenFromSupabaseCookie(allCookies);
    if (!accessToken) return null;

    const verified = await supabase.auth.getUser(accessToken);
    if (verified.error || !verified.data.user) return null;
    return {
      id: verified.data.user.id,
      email: verified.data.user.email
    };
  } catch {
    return null;
  }
}
