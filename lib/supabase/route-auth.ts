import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

export interface AuthenticatedRouteUser {
  id: string;
  email?: string;
}

export interface RouteAuthResult {
  ok: boolean;
  message?: string;
  user?: AuthenticatedRouteUser;
}

export async function requireAuthenticatedRouteUser(request: Request): Promise<RouteAuthResult> {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return { ok: false, message: "Authenticated Supabase session is required." };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await withSupabaseTimeout(supabase.auth.getUser(token), 7000);
    if (error || !data.user) return { ok: false, message: "Supabase session is invalid or expired." };
    return {
      ok: true,
      user: {
        id: data.user.id,
        email: data.user.email
      }
    };
  } catch {
    return { ok: false, message: "Supabase session could not be verified." };
  }
}
